// Chuan hoa tieng Viet va so khop mo cho tim kiem khach san.
// Muc tieu: nguoi dung go "da nag", "vungtau", "metropol" van tim ra ket qua.

const CITY_LABELS = {
  "da-lat": "Da Lat Dalat Lam Dong",
  "da-nang": "Da Nang Danang",
  "ha-noi": "Ha Noi Hanoi",
  "ho-chi-minh": "Ho Chi Minh Sai Gon Saigon TPHCM HCM",
  "vung-tau": "Vung Tau",
};

const TYPE_LABELS = {
  hotel: "hotel khach san",
  resort: "resort khu nghi duong",
  villa: "villa biet thu",
  hostel: "hostel nha nghi",
  apartment: "apartment can ho",
  business: "business khach san cong tac",
};

// Bo dau tieng Viet: "Đà Nẵng" -> "da nang"
const stripAccents = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

// Chuan hoa co ban: bo dau, ve chu thuong, gop khoang trang.
const normalize = (value = "") =>
  stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Dang nen: bo luon khoang trang, chi con ky tu chu-so.
// "Vũng Tàu" -> "vungtau", nen "vungtau" va "vung tau" khop nhau.
const compact = (value = "") => normalize(value).replace(/\s/g, "");

// Chuoi tim kiem luu san trong DB de khong phai tinh lai moi lan query.
const buildSearchIndex = (property = {}) => {
  const parts = [
    property.title,
    property.address,
    property.city,
    CITY_LABELS[property.city] || "",
    property.type,
    TYPE_LABELS[property.type] || "",
    property.description,
  ];
  return normalize(parts.filter(Boolean).join(" "));
};

// Kiem tra `needle` co xuat hien theo dung thu tu ky tu trong `haystack` khong.
// Cho phep thieu ky tu: "mtrpl" khop "metropole".
const isSubsequence = (needle, haystack) => {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
};

// Khoang cach sua (Levenshtein) co gioi han, thoat som khi vuot nguong.
const editDistanceWithin = (a, b, maxDistance) => {
  if (Math.abs(a.length - b.length) > maxDistance) return false;
  if (a === b) return true;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowBest = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
      if (current[j] < rowBest) rowBest = current[j];
    }
    if (rowBest > maxDistance) return false;
    previous = current;
  }
  return previous[b.length] <= maxDistance;
};

// Nguong loi cho phep tang theo do dai tu: tu ngan thi khat khe hon.
const allowedTypos = (word) => {
  if (word.length <= 3) return 0;
  if (word.length <= 5) return 1;
  return 2;
};

// Mot tu cua cau tim co khop tu nao do trong ban ghi khong?
const wordMatches = (word, targetWords) =>
  targetWords.some((candidate) => {
    if (word === candidate) return true;

    // Tien to chi tinh tu 3 ky tu tro len: neu khong "da" se khop ca
    // "dalat" lan "danang", lam nhieu ket qua.
    //
    // Chieu nguoc lai (word.startsWith(candidate)) da tung duoc dung o day
    // nhung phai bo: mot chuoi rac nhu "khachsankhongtontai" bat dau bang
    // "khach" - mot tu co trong nhan loai hinh - nen khop het moi khach san.
    if (word.length >= 3 && candidate.startsWith(word)) return true;

    const tolerance = allowedTypos(word);
    return tolerance > 0 && editDistanceWithin(word, candidate, tolerance);
  });

/**
 * Cham diem mot ban ghi voi tu khoa nguoi dung go.
 * Tra ve so duong neu khop, 0 neu khong khop.
 * Diem cao hon = khop chinh xac hon, dung de sap xep ket qua.
 *
 * Nguyen tac: THA BO SOT CON HON BAO SAI. Mot chuoi vo nghia phai tra ve 0,
 * khong duoc "khop mo" ra ca danh sach khach san.
 */
const scoreMatch = (keyword, searchIndex = "") => {
  const query = normalize(keyword);
  if (!query) return 1;

  const target = searchIndex || "";
  const targetCompact = compact(target);
  const queryCompact = compact(query);

  // 1. Khop nguyen cum sau khi bo dau va bo khoang trang.
  //    "vungtau", "vung tau", "Vũng Tàu" deu roi vao day.
  if (targetCompact.includes(queryCompact)) {
    return target.startsWith(query) ? 100 : 80;
  }

  const queryWords = query.split(" ").filter(Boolean);
  const targetWords = target.split(" ").filter(Boolean);

  // 2. MOI tu trong cau tim deu phai khop, cho phep go sai vai ky tu.
  //    Khop mot phan khong duoc tinh la khop: "da nang" khong duoc keo
  //    ca khach san Da Lat vao chi vi trung chu "da".
  if (queryWords.every((word) => wordMatches(word, targetWords))) {
    return 60;
  }

  // 3. Cuu canh cuoi cho tu viet tat/thieu nguyen am ("mtrpl" -> "metropole").
  //    Chi so khop trong pham vi MOT tu va gioi han do dai, thay vi quet
  //    ca chuoi index - neu khong bat ky chuoi ky tu nao cung se "khop".
  if (queryWords.length === 1 && queryCompact.length >= 5) {
    const found = targetWords.some(
      (candidate) =>
        candidate.length <= queryCompact.length * 2 &&
        isSubsequence(queryCompact, candidate),
    );
    if (found) return 20;
  }

  return 0;
};

module.exports = {
  stripAccents,
  normalize,
  compact,
  buildSearchIndex,
  scoreMatch,
  CITY_LABELS,
  TYPE_LABELS,
};
