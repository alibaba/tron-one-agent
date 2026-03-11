/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import React from 'react';

const SuggestHotelCard: React.FC<{ data: any; type?: string }> = ({ data }) => {
  const hotels = data?.hotels ?? [];

  if (!hotels.length) {
    return (
      <div
        style={{
          borderRadius: 8,
          background: "#fff7e6",
          padding: 12,
          marginTop: 8,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>为你推荐的酒店</div>
        <div style={{ color: "#8c8c8c", fontSize: 12 }}>暂无可展示的酒店数据</div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 8,
        background: "#fff7e6",
        padding: 12,
        marginTop: 8,
      }}
   >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 8,
          gap: 6,
        }}
      >
        <i className="fas fa-hotel" style={{ color: "#fa8c16" }}></i>
        <span style={{ fontWeight: 600 }}>为你推荐的酒店</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {hotels.map((hotel: any) => (
          <div
            key={hotel.id || hotel.name}
            style={{
              display: "flex",
              alignItems: "stretch",
              padding: 10,
              borderRadius: 8,
              background: "#fff",
              border: "1px solid #ffe7ba",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: "#fff1b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                fontSize: 24,
              }}
            >
              <span role="img" aria-label="hotel">
                🏨
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 4,
                  fontSize: 14,
                  color: "#262626",
                }}
              >
                {hotel.name}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  fontSize: 12,
                  color: "#595959",
                }}
              >
                {hotel.price && (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "#fff7e6",
                      color: "#d46b08",
                    }}
                  >
                    {hotel.price}
                  </span>
                )}
                {hotel.distance && (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "#f5f5f5",
                    }}
                  >
                    {hotel.distance}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestHotelCard;
