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

const CalendarCard: React.FC<{ data: any; type?: string }> = ({ data }) => {
  const events = data?.events ?? [];
  const month = data?.month || new Date().toLocaleString('zh-CN', { year: 'numeric', month: 'long' });
  const year = data?.year || new Date().getFullYear();
  const monthNum = data?.monthNum || new Date().getMonth() + 1;

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m - 1, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, monthNum);
  const firstDay = getFirstDayOfMonth(year, monthNum);
  
  const calendarDays: Array<{ day: number | null; events: any[] }> = [];
  
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push({ day: null, events: [] });
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = events.filter((event: any) => event.day === day);
    calendarDays.push({ day, events: dayEvents });
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const getEventStyle = (type: string) => {
    const typeMap: Record<string, { bg: string; color: string; icon: string }> = {
      meeting: { bg: '#e6f7ff', color: '#1890ff', icon: 'fa-users' },
      task: { bg: '#fff7e6', color: '#fa8c16', icon: 'fa-tasks' },
      reminder: { bg: '#f6ffed', color: '#52c41a', icon: 'fa-bell' },
      event: { bg: '#f9f0ff', color: '#722ed1', icon: 'fa-calendar-check' },
      deadline: { bg: '#fff1f0', color: '#ff4d4f', icon: 'fa-exclamation-circle' },
    };
    return typeMap[type] || { bg: '#f5f5f5', color: '#8c8c8c', icon: 'fa-circle' };
  };

  if (!events.length) {
    return (
      <div
        style={{
          borderRadius: 8,
          background: '#fafafa',
          padding: 16,
          marginTop: 8,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, color: '#262626' }}>📅 {month}</div>
        <div style={{ color: '#8c8c8c', fontSize: 12 }}>暂无日程安排</div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 12,
        background: '#fff',
        border: '1px solid #e8e8e8',
        padding: 16,
        marginTop: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '2px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-calendar-alt" style={{ color: '#1890ff', fontSize: 18 }}></i>
          <span style={{ fontWeight: 600, fontSize: 16, color: '#262626' }}>{month}</span>
        </div>
        <div
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            background: '#f0f5ff',
            color: '#1890ff',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {events.length} 个日程
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 8,
        }}
      >
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: idx === 0 || idx === 6 ? '#ff4d4f' : '#8c8c8c',
              padding: '6px 0',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}
      >
        {calendarDays.map((item, idx) => {
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;
          const hasEvents = item.events.length > 0;
          const today = new Date().getDate();
          const isToday = item.day === today && monthNum === new Date().getMonth() + 1;

          return (
            <div
              key={idx}
              style={{
                aspectRatio: '1',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: 4,
                background: item.day ? (isToday ? '#e6f7ff' : '#fafafa') : 'transparent',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {item.day && (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 600 : 400,
                      color: isWeekend ? '#ff4d4f' : isToday ? '#1890ff' : '#262626',
                      marginBottom: 2,
                    }}
                  >
                    {item.day}
                  </div>
                  {hasEvents && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {item.events.slice(0, 2).map((event: any, eventIdx: number) => {
                        const eventStyle = getEventStyle(event.type);
                        return (
                          <div
                            key={eventIdx}
                            style={{
                              fontSize: 9,
                              padding: '2px 4px',
                              borderRadius: 3,
                              background: eventStyle.bg,
                              color: eventStyle.color,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: 500,
                            }}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {item.events.length > 2 && (
                        <div
                          style={{
                            fontSize: 9,
                            color: '#8c8c8c',
                            textAlign: 'center',
                          }}
                        >
                          +{item.events.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#262626' }}>
          日程详情
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.slice(0, 5).map((event: any, idx: number) => {
            const eventStyle = getEventStyle(event.type);
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: 10,
                  borderRadius: 8,
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: eventStyle.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className={`fas ${eventStyle.icon}`} style={{ color: eventStyle.color, fontSize: 14 }}></i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#262626' }}>
                      {event.title}
                    </div>
                    <div
                      style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: eventStyle.bg,
                        color: eventStyle.color,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {monthNum}/{event.day}
                    </div>
                  </div>
                  {event.time && (
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>
                      <i className="fas fa-clock" style={{ marginRight: 4 }}></i>
                      {event.time}
                    </div>
                  )}
                  {event.description && (
                    <div style={{ fontSize: 12, color: '#595959' }}>
                      {event.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {events.length > 5 && (
            <div style={{ fontSize: 12, color: '#8c8c8c', textAlign: 'center', paddingTop: 4 }}>
              还有 {events.length - 5} 个日程...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarCard;
