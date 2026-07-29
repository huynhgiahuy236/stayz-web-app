import { Star } from "lucide-react";
import type { Review, User } from "@/lib/types";
import { resolveImage } from "@/lib/api";

interface Props {
  review: Review;
}

function getInitials(name?: string) {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("vi-VN", { year: "numeric", month: "long" }).format(new Date(dateStr));
}

export function ReviewCard({ review }: Props) {
  const user = typeof review.user_id === "object" ? (review.user_id as User) : null;
  const avatarUrl = user?.avatar?.url;

  return (
    <div className="review-card">
      <div className="review-header">
        {avatarUrl ? (
          <img
            src={resolveImage(avatarUrl)}
            alt={user?.full_name ?? "Khách"}
            className="reviewer-avatar"
          />
        ) : (
          <div className="reviewer-avatar-initials" aria-hidden="true">
            {getInitials(user?.full_name)}
          </div>
        )}
        <div>
          <p className="reviewer-name">{user?.full_name ?? "Khách ẩn danh"}</p>
          <p className="review-date">{formatDate(review.createdAt)}</p>
        </div>
      </div>

      <div className="review-stars" aria-label={`Đánh giá ${review.rating} sao`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            fill={i < review.rating ? "var(--gold)" : "none"}
            stroke={i < review.rating ? "var(--gold)" : "var(--color-ink-3)"}
            aria-hidden="true"
          />
        ))}
      </div>

      {review.comment && (
        <p className="review-comment">{review.comment}</p>
      )}
    </div>
  );
}
