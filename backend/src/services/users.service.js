const {
  ConflictException,
  BadRequestException,
  UnauthorizedError,
  ForbiddenException,
} = require("../helpers/error.helper");
const usersModel = require("../models/users.model");
const bookingModel = require("../models/bookings.model");
const paymentsModel = require("../models/payments.model");
const reviewsModel = require("../models/reviews.model");
const favoritesModel = require("../models/favorites.model");
const propertiesModel = require("../models/properties.model");
const notificationsModel = require("../models/notifications.model");
const conversationsModel = require("../models/conversations.model");
const messagesModel = require("../models/messages.model");
const adminAuditModel = require("../models/adminAudit.model");

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const cloudinary = require("../config/cloudinary.config");
const streamifier = require("streamifier");
const { sendPasswordResetCodeEmail, sendRegisterCodeEmail } = require("../config/mailer.config");
const { generateAuthTokens, generateAccessToken, verifyRefreshToken, verifyAccessToken } = require("../utils/token.util");
const redis = require("../config/redis.config");
// buildResetCodeHash dung SECRET nhung truoc day khong he import bien nay,
// nen ca luong OTP se nem ReferenceError neu duoc goi toi.
const { SECRET } = require("../constants/app.constant");

const RESET_CODE_EXPIRES_IN_MINUTES = 10;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+$/;
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿĀ-ỹĐđ]+(?:[ '\-][A-Za-zÀ-ÖØ-öø-ÿĀ-ỹĐđ]+)*$/;
const VIETNAMESE_PHONE_PATTERN = /^(?:03[2-9]|05[25689]|07[06-9]|08[1-9]|09[0-9])\d{7}$/;

const assertStrongPassword = (password) => {
  const value = String(password || "");
  if (
    value.length < 8 ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/\d/.test(value) ||
    !/[^A-Za-z0-9\s]/.test(value) ||
    /\s/.test(value)
  ) {
    throw new BadRequestException(
      "Mat khau phai co it nhat 8 ky tu, gom chu hoa, chu thuong, so va ky tu dac biet",
    );
  }
};

const buildResetCodeHash = (email, code) => {
  return crypto
    .createHash("sha256")
    .update(`${email}:${code}:${SECRET}`)
    .digest("hex");
};

/**
 * Xac thuc ma OTP dat lai mat khau.
 * Nem loi neu thieu tham so, ma het han hoac ma sai.
 * Tra ve email da chuan hoa de ham goi dung tiep.
 */
const assertResetCode = async (email, code) => {
  if (!email?.trim() || !code?.toString().trim()) {
    throw new BadRequestException("Thiếu email hoặc mã xác thực");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.toString().trim();

  const storedHash = await redis.get(`otp:${normalizedEmail}`);
  if (!storedHash) {
    throw new BadRequestException("Mã xác thực không hợp lệ hoặc đã hết hạn");
  }

  const incomingHash = buildResetCodeHash(normalizedEmail, normalizedCode);

  // So sanh theo thoi gian hang so de khong ro ri thong tin qua do tre.
  const stored = Buffer.from(storedHash, "utf8");
  const incoming = Buffer.from(incomingHash, "utf8");
  const matches =
    stored.length === incoming.length && crypto.timingSafeEqual(stored, incoming);

  if (!matches) {
    throw new BadRequestException("Mã xác thực không đúng");
  }

  return { normalizedEmail, normalizedCode };
};

const assertRegisterCode = async (email, code) => {
  if (!email?.trim() || !code?.toString().trim()) {
    throw new BadRequestException("Thieu email hoac ma xac thuc dang ky");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.toString().trim();
  const storedHash = await redis.get(`register-otp:${normalizedEmail}`);
  if (!storedHash) {
    throw new BadRequestException("Ma xac thuc dang ky khong hop le hoac da het han");
  }

  const incomingHash = buildResetCodeHash(normalizedEmail, normalizedCode);
  const stored = Buffer.from(storedHash, "utf8");
  const incoming = Buffer.from(incomingHash, "utf8");
  const matches =
    stored.length === incoming.length && crypto.timingSafeEqual(stored, incoming);

  if (!matches) {
    throw new BadRequestException("Ma xac thuc dang ky khong dung");
  }

  return { normalizedEmail, normalizedCode };
};

const createResetCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const clearResetPasswordData = (user) => {
  user.reset_password = {
    code_hash: "",
    expires_at: null,
    requested_at: null,
  };
};

const getCookieValue = (cookieHeader, cookieName) => {
  if (!cookieHeader) return ""; 

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const targetCookie = cookies.find((item) =>
    item.startsWith(`${cookieName}=`),
  );

  if (!targetCookie) return "";

  return decodeURIComponent(targetCookie.slice(cookieName.length + 1));
};

const sanitizeUser = (userDoc) => {
  if (!userDoc) return userDoc;

  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;

  return user;
};

const userService = {
  getAll: async () => {
    const users = await usersModel.find();
    if (users.length === 0) {
      throw new BadRequestException("Khong co user nao");
    }
    return users.map((user) => sanitizeUser(user));
  },
  getById: async (id) => {
    const user = await usersModel.findById(id);
    if (!user) {
      throw new BadRequestException("Khong tim thay user nay");
    }
    return sanitizeUser(user);
  },
  delete: async (id, actor) => {
    const target = await usersModel.findById(id);
    if (!target) throw new BadRequestException("Khong tim thay user nay de xoa");
    if (actor?.role !== "admin") throw new ForbiddenException("Chi admin duoc xoa tai khoan");
    if (target.role === "admin" && target.is_active !== false && (await usersModel.countDocuments({ role: "admin", is_active: { $ne: false } })) <= 1) {
      throw new BadRequestException("Khong the xoa quan tri vien cuoi cung");
    }
    const [bookings, payments, reviews, favorites, properties, notifications, conversations, messages, audits] = await Promise.all([
      bookingModel.countDocuments({ $or: [{ user_id: id }, { attendance_confirmed_by: id }] }),
      paymentsModel.countDocuments({ user_id: id }),
      reviewsModel.countDocuments({ user_id: id }),
      favoritesModel.countDocuments({ user_id: id }),
      propertiesModel.countDocuments({ user_id: id }),
      notificationsModel.countDocuments({ user_id: id }),
      conversationsModel.countDocuments({ participants: id }),
      messagesModel.countDocuments({ sender_id: id }),
      adminAuditModel.countDocuments({ admin_id: id }),
    ]);
    if (bookings || payments || reviews || favorites || properties || notifications || conversations || messages || audits) {
      target.is_active = false;
      await target.save();
      return sanitizeUser(target);
    }
    const result = await usersModel.findByIdAndDelete(id);
    return sanitizeUser(result);
  },
  update: async (id, data, actor) => {
    const user = await usersModel.findById(id);
    if (!user) {
      throw new BadRequestException("Khong tim thay user nay");
    }

    const {
      full_name,
      email,
      phone_number,
      gender,
      home_address,
      date_of_birth,
      role,
      password,
      avatar,
      is_active,
    } = data;

    if (full_name !== undefined) {
      const normalizedName = String(full_name).trim();
      if (!normalizedName) throw new BadRequestException("Ho ten khong duoc de trong");
      user.full_name = normalizedName;
    }
    if (email != null) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        throw new BadRequestException("Email khong hop le");
      }
      const duplicate = await usersModel.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });
      if (duplicate) throw new ConflictException("Email da ton tai");
      user.email = normalizedEmail;
    }
    if (phone_number !== undefined) {
      const normalizedPhone = String(phone_number).trim();
      if (normalizedPhone && !VIETNAMESE_PHONE_PATTERN.test(normalizedPhone)) {
        throw new BadRequestException("So dien thoai Viet Nam khong hop le");
      }
      const duplicatePhone = normalizedPhone
        ? await usersModel.findOne({ phone_number: normalizedPhone, _id: { $ne: id } })
        : null;
      if (duplicatePhone) throw new ConflictException("So dien thoai da ton tai");
      user.phone_number = normalizedPhone;
    }
    if (gender !== undefined) user.gender = gender;
    if (home_address !== undefined) user.home_address = String(home_address).trim();
    if (date_of_birth !== undefined) {
      const parsedDate = date_of_birth ? new Date(date_of_birth) : null;
      if (parsedDate && Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException("Ngay sinh khong hop le");
      }
      user.date_of_birth = parsedDate;
    }
    if (role !== undefined) {
      if (actor?.role !== "admin") throw new ForbiddenException("Chi admin duoc thay doi vai tro");
      if (!["admin", "user"].includes(role)) throw new BadRequestException("Vai tro khong hop le");
      if (user.role === "admin" && user.is_active !== false && role !== "admin" && (await usersModel.countDocuments({ role: "admin", is_active: { $ne: false } })) <= 1) {
        throw new BadRequestException("Khong the ha quyen quan tri vien cuoi cung");
      }
      user.role = role;
    }
    if (is_active !== undefined) {
      if (actor?.role !== "admin") throw new ForbiddenException("Chi admin duoc thay doi trang thai tai khoan");
      if (user.role === "admin" && is_active === false && (await usersModel.countDocuments({ role: "admin", is_active: { $ne: false } })) <= 1) {
        throw new BadRequestException("Khong the vo hieu hoa quan tri vien cuoi cung");
      }
      user.is_active = is_active !== false;
    }
    if (password?.trim()) {
      assertStrongPassword(String(password).trim());
      user.password = await bcrypt.hash(String(password).trim(), 10);
    }
    if (avatar) {
      user.avatar = avatar;
    }

    await user.save();
    return sanitizeUser(user);
  },
  createByAdmin: async (data) => {
    const {
      email,
      password,
      full_name,
      phone_number = "",
      gender = "",
      home_address = "",
      role = "user",
      date_of_birth,
      is_active = true,
    } = data;

    if (!email?.trim() || !password || !full_name?.trim()) {
      throw new BadRequestException("Thiếu email, mật khẩu hoặc họ tên");
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      throw new BadRequestException("Email khong hop le");
    }
    assertStrongPassword(String(password).trim());
    const normalizedPhone = String(phone_number).trim();
    if (normalizedPhone && !VIETNAMESE_PHONE_PATTERN.test(normalizedPhone)) {
      throw new BadRequestException("So dien thoai Viet Nam khong hop le");
    }
    if (await usersModel.findOne({ email: normalizedEmail })) {
      throw new ConflictException("Email đã tồn tại");
    }
    if (normalizedPhone && await usersModel.findOne({ phone_number: normalizedPhone })) {
      throw new ConflictException("So dien thoai da ton tai");
    }
    const parsedBirthDate = date_of_birth ? new Date(date_of_birth) : null;
    if (parsedBirthDate && Number.isNaN(parsedBirthDate.getTime())) {
      throw new BadRequestException("Ngay sinh khong hop le");
    }

    const user = await usersModel.create({
      email: normalizedEmail,
      password: await bcrypt.hash(String(password).trim(), 10),
      full_name: full_name.trim(),
      phone_number: normalizedPhone,
      gender,
      home_address,
      role: role === "admin" ? "admin" : "user",
      date_of_birth: parsedBirthDate,
      is_active: is_active !== false,
    });
    return sanitizeUser(user);
  },
  create: async (data) => {
    const {
      email,
      password,
      full_name,
      phone_number = "",
      gender = "",
      home_address = "",
      role = "user",
      avatar = {
        url: "",
        public_id: "",
      },
      register_code,
    } = data;

    if (!email?.trim() || !password || !full_name?.trim()) {
      throw new BadRequestException("Thieu email, mat khau hoac ho ten");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = full_name.trim();
    const normalizedPhone = String(phone_number).trim();
    const normalizedPassword = String(password);
    if (normalizedEmail.includes("..") || !EMAIL_PATTERN.test(normalizedEmail)) {
      throw new BadRequestException("Email khong dung dinh dang");
    }
    if (!NAME_PATTERN.test(normalizedName)) {
      throw new BadRequestException("Ho ten chi duoc chua chu cai, khong chua so");
    }
    if (!VIETNAMESE_PHONE_PATTERN.test(normalizedPhone)) {
      throw new BadRequestException("So dien thoai Viet Nam khong hop le");
    }
    if (
      normalizedPassword.length < 8 ||
      !/[a-z]/.test(normalizedPassword) ||
      !/[A-Z]/.test(normalizedPassword) ||
      !/\d/.test(normalizedPassword) ||
      !/[^A-Za-z0-9\s]/.test(normalizedPassword) ||
      /\s/.test(normalizedPassword)
    ) {
      throw new BadRequestException(
        "Mat khau phai co it nhat 8 ky tu, gom chu hoa, chu thuong, so va ky tu dac biet",
      );
    }

    const { normalizedEmail: verifiedEmail } = await assertRegisterCode(normalizedEmail, register_code);

    const existing = await usersModel.findOne({ email: normalizedEmail });
    if (existing) {
      throw new ConflictException("Email da ton tai");
    }
    const existingPhone = await usersModel.findOne({ phone_number: normalizedPhone });
    if (existingPhone) {
      throw new ConflictException("So dien thoai da ton tai");
    }
    const hasedPassword = await bcrypt.hash(password, 10);
    // Public registration can never choose an administrative role.
    const safeRole = "user";

    let user;
    try {
      user = await usersModel.create({
        email: verifiedEmail,
        password: hasedPassword,
        full_name: normalizedName,
        phone_number: normalizedPhone,
        gender,
        home_address,
        avatar,
        role: safeRole,
      });
    } catch (error) {
      if (error?.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {})[0];
        throw new ConflictException(
          duplicateField === "phone_number" ? "So dien thoai da ton tai" : "Email da ton tai",
        );
      }
      throw error;
    }
    await redis.del(`register-otp:${verifiedEmail}`);
    return sanitizeUser(user);
  },

  requestRegisterOtp: async (email) => {
    if (!email?.trim()) {
      throw new BadRequestException("Vui long nhap email");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await usersModel.findOne({ email: normalizedEmail });
    if (existing) {
      throw new ConflictException("Email da ton tai");
    }

    const code = createResetCode();
    const hash = buildResetCodeHash(normalizedEmail, code);
    const ttlSeconds = RESET_CODE_EXPIRES_IN_MINUTES * 60;
    await redis.setex(`register-otp:${normalizedEmail}`, ttlSeconds, hash);

    try {
      await sendRegisterCodeEmail({ to: normalizedEmail, code });
    } catch (error) {
      console.error("Gui email OTP dang ky that bai:", error.message);
      await redis.del(`register-otp:${normalizedEmail}`);
      throw new BadRequestException("Khong the gui email OTP. Vui long thu lai sau");
    }

    return {
      email: normalizedEmail,
      expires_in_minutes: RESET_CODE_EXPIRES_IN_MINUTES,
    };
  },

  verifyRegisterOtp: async ({ email, code }) => {
    const { normalizedEmail } = await assertRegisterCode(email, code);
    return {
      email: normalizedEmail,
      verified: true,
    };
  },

  login: async (data) => {
    const { email, password } = data;
    if (!email || !password) {
      throw new BadRequestException("Thieu email hoac mat khau");
    }
    const user = await usersModel.findOne({ email: email });
    if (!user || user.is_active === false) {
      throw new UnauthorizedError("Email khong ton tai");
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError("Sai mat khau");
    }
    const { accessToken, refreshToken } = generateAuthTokens(user);
    return {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    };
  },
  refreshAccessToken: async (req) => {
    const refreshToken = getCookieValue(req.headers.cookie, "refreshToken");

    if (!refreshToken) {
      throw new UnauthorizedError("Khong tim thay refresh token");
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedError("Refresh token khong hop le hoac da het han");
    }

    const user = await usersModel.findById(decoded.userId);
    if (!user || user.is_active === false) {
      throw new UnauthorizedError("Nguoi dung khong ton tai");
    }

    return {
      accessToken: generateAccessToken(user),
      user: sanitizeUser(user),
    };
  },
  logout: async (req) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (accessToken) {
        const decoded = verifyAccessToken(accessToken);
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - now;

        if (ttl > 0) {
          // Đưa token vào blacklist cho đến khi nó tự hết hạn
          await redis.setex(`blacklist:${accessToken}`, ttl, "1");
        }
      }
    } catch {
      // Token không hợp lệ hoặc đã hết hạn → không cần blacklist
    }

    return { loggedOut: true };
  },
  requestPasswordReset: async (email) => {
    if (!email?.trim()) {
      throw new BadRequestException("Vui lòng nhập email");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await usersModel.findOne({ email: normalizedEmail });

    if (!user) {
      // Không tiết lộ email có tồn tại hay không (bảo mật)
      return {
        email: normalizedEmail,
        expires_in_minutes: RESET_CODE_EXPIRES_IN_MINUTES,
      };
    }

    const code = createResetCode();
    const hash = buildResetCodeHash(normalizedEmail, code);
    const ttlSeconds = RESET_CODE_EXPIRES_IN_MINUTES * 60;

    // Lưu OTP vào Redis với TTL tự động hết hạn (không cần cron cleanup)
    await redis.setex(`otp:${normalizedEmail}`, ttlSeconds, hash);

    try {
      await sendPasswordResetCodeEmail({ to: normalizedEmail, code });
    } catch (error) {
      console.error("Gui email OTP that bai:", error.message);
      await redis.del(`otp:${normalizedEmail}`);
      throw new BadRequestException("Khong the gui email OTP. Vui long thu lai sau");
    }

    return {
      email: normalizedEmail,
      expires_in_minutes: RESET_CODE_EXPIRES_IN_MINUTES,
    };
  },
  // Doi chieu ma OTP nguoi dung nhap voi hash luu trong Redis.
  // Khong xoa ma o buoc nay: nguoi dung con phai nhap mat khau moi.
  verifyPasswordResetCode: async ({ email, code }) => {
    const { normalizedEmail } = await assertResetCode(email, code);

    return {
      email: normalizedEmail,
      verified: true,
    };
  },

  // Doi mat khau. BAT BUOC kem ma OTP hop le - truoc day ham nay chi can
  // email la ghi de duoc mat khau cua bat ky ai.
  resetPasswordWithCode: async ({ email, code, newPassword }) => {
    if (!newPassword) {
      throw new BadRequestException("Vui lòng nhập mật khẩu mới");
    }
    if (String(newPassword).length < 6) {
      throw new BadRequestException("Mật khẩu mới phải có ít nhất 6 ký tự");
    }

    const { normalizedEmail } = await assertResetCode(email, code);

    const user = await usersModel.findOne({ email: normalizedEmail });
    if (!user) {
      throw new BadRequestException("Người dùng không tồn tại");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    clearResetPasswordData(user);
    await user.save();

    // Ma chi dung duoc mot lan.
    await redis.del(`otp:${normalizedEmail}`);

    return {
      email: normalizedEmail,
      passwordUpdated: true,
    };
  },

  uploadLocal: async (req) => {
    const file = req.file;
    if (!file) {
      throw new BadRequestException("Vui long gui hinh anh bang key avatar");
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError("Token khong hop le");
    }
    const user = await usersModel.findById(userId);
    if (!user) {
      throw new BadRequestException("Khong tim thay user");
    }

    user.avatar = { url: `/images/avatars/${file.filename}`, public_id: "" };
    await user.save();

    return { filename: file.filename, imgUrl: `/images/avatars/${file.filename}` };
  },

  uploadCloud: async (req) => {
    const file = req.file;
    if (!file) {
      throw new BadRequestException(
        "Vui long gui hinh anh bang key avatar (form-data)",
      );
    }

    const userId = req.params?.id || req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError("Token khong hop le");
    }
    if (req.params?.id && req.user?.role !== "admin" && req.params.id !== req.user?.userId) {
      throw new UnauthorizedError("Bạn không có quyền cập nhật ảnh đại diện này");
    }

    const user = await usersModel.findById(userId);
    if (!user) {
      throw new BadRequestException("Khong tim thay user");
    }

    if (user.avatar?.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "avatars", resource_type: "image" },
        (error, uploaded) => {
          if (error) return reject(error);
          resolve(uploaded);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });

    user.avatar = {
      url: result.secure_url,
      public_id: result.public_id,
    };
    await user.save();

    return {
      avatar: user.avatar,
    };
  },
};

module.exports = userService;
