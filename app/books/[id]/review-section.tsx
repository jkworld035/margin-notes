"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Stars from "../stars";
import { submitReview, deleteReview } from "@/app/actions/reviews";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  review: string;
  created_at: string;
  name: string | null;
};

export default function ReviewSection({
  bookId,
  reviews,
  average,
  count,
  myReview,
  isLoggedIn,
  isAuthor,
}: {
  bookId: string;
  reviews: Review[];
  average: number;
  count: number;
  myReview: { rating: number; review: string } | null;
  isLoggedIn: boolean;
  isAuthor: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [text, setText] = useState(myReview?.review ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setError("");
      const result = await submitReview(bookId, rating, text);
      if (result && "error" in result && result.error) setError(result.error);
      else router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      setError("");
      const result = await deleteReview(bookId);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setRating(0);
        setText("");
        router.refresh();
      }
    });

  return (
    <section className="reviews" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="book-toc-heading">
        Reader reviews
      </h2>

      <div className="reviews-summary">
        {count > 0 ? (
          <>
            <span className="reviews-avg">{average.toFixed(1)}</span>
            <Stars value={average} />
            <span className="reviews-count">
              {count} {count === 1 ? "rating" : "ratings"}
            </span>
          </>
        ) : (
          <span className="reviews-count">No ratings yet.</span>
        )}
      </div>

      {isAuthor ? null : !isLoggedIn ? (
        <p className="reviews-note">
          <Link href="/login" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            Log in
          </Link>{" "}
          to rate and review this book.
        </p>
      ) : (
        <div className="review-form">
          <div role="radiogroup" aria-label="Your rating" className="star-picker">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className={n <= rating ? "on" : ""}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Share what you thought (optional)"
          />

          {error && <div className="form-error">{error}</div>}

          <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={pending || rating === 0}
              onClick={save}
            >
              {myReview ? "Update review" : "Post review"}
            </button>

            {myReview && (
              <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={remove}>
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="review-list">
          {reviews.map((r) => (
            <li key={r.id}>
              <div className="review-head">
                <Stars value={r.rating} />
                <span className="review-name">{r.name || "Reader"}</span>
                <span className="review-date">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.review && <p>{r.review}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
