"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, Suspense } from "react";
import { Search } from "lucide-react";

interface Props {
  initialCity?: string;
  initialKeyword?: string;
}

const CITIES = [
  { value: "", label: "Tất cả thành phố" },
  { value: "da-nang", label: "Đà Nẵng" },
  { value: "da-lat", label: "Đà Lạt" },
  { value: "ha-noi", label: "Hà Nội" },
  { value: "vung-tau", label: "Vũng Tàu" },
  { value: "hoi-an", label: "Hội An" },
  { value: "nha-trang", label: "Nha Trang" },
  { value: "ho-chi-minh", label: "TP. Hồ Chí Minh" },
  { value: "phu-quoc", label: "Phú Quốc" },
];

function SearchBarInner({ initialCity, initialKeyword }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const keywordRef = useRef<HTMLInputElement>(null);
  const [city, setCity] = useState(initialCity ?? sp.get("city") ?? "");
  const [keyword, setKeyword] = useState(initialKeyword ?? sp.get("keyword") ?? "");
  const [guests, setGuests] = useState(sp.get("guests") ?? "");
  const [type, setType] = useState(sp.get("type") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (keyword) q.set("keyword", keyword);
    if (city) q.set("city", city);
    if (guests) q.set("guests", guests);
    if (type) q.set("type", type);
    router.push(`/search?${q.toString()}`);
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit} role="search" aria-label="Tìm kiếm khách sạn">
      <div className="search-field">
        <label htmlFor="sb-keyword">Tìm kiếm</label>
        <input
          id="sb-keyword"
          ref={keywordRef}
          type="text"
          placeholder="Tên khách sạn, khu vực..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="search-field">
        <label htmlFor="sb-city">Thành phố</label>
        <select
          id="sb-city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Chọn thành phố"
        >
          {CITIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="search-field">
        <label htmlFor="sb-type">Loại hình</label>
        <select
          id="sb-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Chọn loại hình lưu trú"
        >
          <option value="">Tất cả loại</option>
          <option value="resort">Resort</option>
          <option value="villa">Villa</option>
          <option value="hotel">Khách sạn</option>
          <option value="homestay">Homestay</option>
        </select>
      </div>
      <div className="search-field" style={{ borderRight: 0 }}>
        <label htmlFor="sb-guests">Số khách</label>
        <input
          id="sb-guests"
          type="number"
          placeholder="Bao nhiêu khách?"
          min={1}
          max={20}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
        />
      </div>
      <button type="submit" className="search-btn" aria-label="Tìm kiếm">
        <Search size={16} aria-hidden="true" />
        Tìm
      </button>
    </form>
  );
}

export function SearchBar(props: Props) {
  return (
    <Suspense fallback={<div className="search-bar" style={{ height: 62, borderRadius: "var(--r-md)" }} />}>
      <SearchBarInner {...props} />
    </Suspense>
  );
}
