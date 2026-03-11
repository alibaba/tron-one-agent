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

const FlightCard: React.FC<{ data: any; type?: string }> = ({ data }) => {
  const flights = data?.flights ?? [];

  if (!flights.length) {
    return (
      <div
        style={{
          borderRadius: 8,
          background: "#e6f7ff",
          padding: 12,
          marginTop: 8,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>为你推荐的航班</div>
        <div style={{ color: "#8c8c8c", fontSize: 12 }}>暂无可展示的航班数据</div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 8,
        background: "#e6f7ff",
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
        <i className="fas fa-plane" style={{ color: "#1890ff" }}></i>
        <span style={{ fontWeight: 600 }}>为你推荐的航班</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {flights.map((flight: any) => (
          <div
            key={flight.id || flight.flightNo}
            style={{
              padding: 12,
              borderRadius: 8,
              background: "#fff",
              border: "1px solid #bae7ff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 600, color: "#1890ff", fontSize: 14 }}>
                {flight.flightNo}
              </div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: flight.status === "准点" ? "#f6ffed" : "#fff7e6",
                  color: flight.status === "准点" ? "#52c41a" : "#fa8c16",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {flight.status || "准点"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#262626" }}>
                  {flight.departureTime}
                </div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                  {flight.departureAirport}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "0 16px",
                }}
              >
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
                  {flight.duration || "2h30m"}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 2,
                    background: "#e8e8e8",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      right: -4,
                      top: -3,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#1890ff",
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#262626" }}>
                  {flight.arrivalTime}
                </div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                  {flight.arrivalAirport}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 8,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <div style={{ fontSize: 12, color: "#595959" }}>
                {flight.cabin || "经济舱"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#ff4d4f" }}>
                ¥{flight.price}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightCard;
