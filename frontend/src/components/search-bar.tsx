"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Search, UsersRound } from "lucide-react";

export function SearchBar({ initialCity = "", initialKeyword = "" }: { initialCity?: string; initialKeyword?: string }) {
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (String(value).trim()) query.set(key, String(value));
    }
    router.push(`/search?${query.toString()}`);
  }

  return (
    <form className="search-bar" onSubmit={submit}>
      <div className="search-field">
        <MapPin className="search-icon" aria-hidden="true" />
        <span><label htmlFor="keyword">Điểm đến hoặc khách sạn</label>
          <input id="keyword" name="keyword" defaultValue={initialKeyword} placeholder="Bạn muốn đi đâu?" /></span>
      </div>
      <div className="search-field">
        <MapPin className="search-icon" aria-hidden="true" />
        <span><label htmlFor="city">Thành phố</label>
          <select id="city" name="city" defaultValue={initialCity}>
          <option value="">Tất cả điểm đến</option>
          <option value="da-nang">Đà Nẵng</option>
          <option value="da-lat">Đà Lạt</option>
          <option value="ha-noi">Hà Nội</option>
          <option value="ho-chi-minh">TP. Hồ Chí Minh</option>
          <option value="vung-tau">Vũng Tàu</option>
          </select></span>
      </div>
      <div className="search-field">
        <CalendarDays className="search-icon" aria-hidden="true" />
        <span><label htmlFor="checkIn">Nhận phòng</label>
          <input id="checkIn" name="checkIn" type="date" /></span>
      </div>
      <div className="search-field">
        <UsersRound className="search-icon" aria-hidden="true" />
        <span><label htmlFor="guests">Khách</label>
          <select id="guests" name="guests" defaultValue="2">
          <option value="1">1 khách</option>
          <option value="2">2 khách</option>
          <option value="3">3 khách</option>
          <option value="4">4 khách</option>
          <option value="6">5+ khách</option>
          </select></span>
      </div>
      <button className="search-button" type="submit"><Search aria-hidden="true" /> <span>Tìm kiếm</span></button>
    </form>
  );
}
