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

const FlightStatusCard: React.FC<{ data: any; type?: string }> = ({ data }) => {
  const flight = data?.flight;

  if (!flight) {
    return (
      <div
        style={{
          borderRadius: 8,
          background: "#f0f5ff",
          padding: 12,
          marginTop: 8,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>航班动态</div>
        <div style={{ color: "#8c8c8c", fontSize: 12 }}>暂无可展示的航班数据</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; icon: string }> = {
      准点: { bg: "#f6ffed", color: "#52c41a", icon: "fa-check-circle" },
      起飞: { bg: "#e6f7ff", color: "#1890ff", icon: "fa-plane-departure" },
      降落: { bg: "#e6f7ff", color: "#1890ff", icon: "fa-plane-arrival" },
      延误: { bg: "#fff7e6", color: "#fa8c16", icon: "fa-clock" },
      取消: { bg: "#fff2e8", color: "#ff4d4f", icon: "fa-times-circle" },
      备降: { bg: "#fff1f0", color: "#ff4d4f", icon: "fa-exclamation-triangle" },
    };
    return statusMap[status] || { bg: "#f5f5f5", color: "#8c8c8c", icon: "fa-info-circle" };
  };

  const statusStyle = getStatusColor(flight.status);

  return (
    <div
      style={{
        borderRadius: 12,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: 16,
        marginTop: 8,
        color: "#fff",
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fas fa-plane" style={{ fontSize: 18 }}></i>
          <span style={{ fontWeight: 600, fontSize: 16 }}>航班动态</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          {flight.updateTime || "实时更新"}
        </div>
      </div>

      <div
        style={{
          background: "rgba(255, 255, 255, 0.15)",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {flight.flightNo}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {flight.airline || "航空公司"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              background: statusStyle.bg,
              color: statusStyle.color,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <i className={`fas ${statusStyle.icon}`}></i>
            <span>{flight.status}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: 8,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
              {flight.departureTime}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 2 }}>
              {flight.departureCity}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {flight.departureAirport}
            </div>
            {flight.departureTerminal && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  background: "rgba(255, 255, 255, 0.2)",
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {flight.departureTerminal}
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "0 20px",
            }}
          >
            <div style={{ fontSize: 11, marginBottom: 8, opacity: 0.85 }}>
              {flight.duration || "2h30m"}
            </div>
            <div
              style={{
                width: "100%",
                height: 2,
                background: "rgba(255, 255, 255, 0.3)",
                position: "relative",
                borderRadius: 2,
              }}
            >
              <i
                className="fas fa-plane"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: 14,
                }}
              ></i>
            </div>
            {flight.progress && (
              <div style={{ fontSize: 11, marginTop: 8, opacity: 0.85 }}>
                已飞行 {flight.progress}
              </div>
            )}
          </div>

          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
              {flight.arrivalTime}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 2 }}>
              {flight.arrivalCity}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {flight.arrivalAirport}
            </div>
            {flight.arrivalTerminal && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  background: "rgba(255, 255, 255, 0.2)",
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {flight.arrivalTerminal}
              </div>
            )}
          </div>
        </div>

        {flight.delayReason && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: "rgba(255, 237, 186, 0.2)",
              borderRadius: 6,
              borderLeft: "3px solid #faad14",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
              }}
            >
              <i className="fas fa-info-circle"></i>
              <span>{flight.delayReason}</span>
            </div>
          </div>
        )}

        {(flight.gate || flight.baggage || flight.checkinCounter) && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid rgba(255, 255, 255, 0.2)",
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 12,
            }}
          >
            {flight.gate && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <i className="fas fa-door-open"></i>
                <span>登机口: {flight.gate}</span>
              </div>
            )}
            {flight.baggage && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <i className="fas fa-suitcase"></i>
                <span>行李转盘: {flight.baggage}</span>
              </div>
            )}
            {flight.checkinCounter && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <i className="fas fa-ticket-alt"></i>
                <span>值机柜台: {flight.checkinCounter}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightStatusCard;
