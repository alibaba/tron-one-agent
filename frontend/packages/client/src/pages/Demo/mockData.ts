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


import { ContentType, SessionMessageStatus, SessionMessageType, UserSessionMessage, AgentSessionMessage } from "chatbox";

const AgentId = "simple_agent";

export const hotelMockMessages: Array<UserSessionMessage | AgentSessionMessage> = [
  {
    id: 1,
    type: SessionMessageType.AGENT,
    status: SessionMessageStatus.SUCCEED,
    agentId: AgentId,
    gmtCreate: new Date().toISOString(),
    gmtModified: new Date().toISOString(),
    contents: [
      {
        type: ContentType.TEXT,
        text: `<customtag type="SuggestHotel" placeholder="正在为你查找酒店...">
{"hotels":[{"id":"1","name":"杭州西湖假日酒店","price":"￥500/晚","distance":"距西湖500m"},{"id":"2","name":"杭州城站精品酒店","price":"￥420/晚","distance":"距地铁站200m"}]}
</customtag>`,
      },
    ],
  },
];

export const flightMockMessages: Array<UserSessionMessage | AgentSessionMessage> = [
  {
    id: 2,
    type: SessionMessageType.AGENT,
    status: SessionMessageStatus.SUCCEED,
    agentId: AgentId,
    gmtCreate: new Date().toISOString(),
    gmtModified: new Date().toISOString(),
    contents: [
      {
        type: ContentType.TEXT,
        text: `<customtag type="Flight" placeholder="正在为你查询航班...">
{"flights":[{"id":"1","flightNo":"CA1234","departureTime":"08:30","departureAirport":"杭州萧山","arrivalTime":"11:00","arrivalAirport":"北京首都","duration":"2h30m","price":"880","cabin":"经济舱","status":"准点"},{"id":"2","flightNo":"MU5678","departureTime":"14:20","departureAirport":"杭州萧山","arrivalTime":"16:45","arrivalAirport":"北京首都","duration":"2h25m","price":"1050","cabin":"经济舱","status":"延误"}]}
</customtag>`,
      },
    ],
  },
];

export const flightStatusMockMessages: Array<UserSessionMessage | AgentSessionMessage> = [
  {
    id: 3,
    type: SessionMessageType.AGENT,
    status: SessionMessageStatus.SUCCEED,
    agentId: AgentId,
    gmtCreate: new Date().toISOString(),
    gmtModified: new Date().toISOString(),
    contents: [
      {
        type: ContentType.TEXT,
        text: `<customtag type="FlightStatus" placeholder="正在查询航班动态...">
{"flight":{"flightNo":"CA1234","airline":"中国国际航空","status":"起飞","departureTime":"08:30","departureCity":"杭州","departureAirport":"杭州萧山国际机场","departureTerminal":"T3航站楼","arrivalTime":"11:00","arrivalCity":"北京","arrivalAirport":"北京首都国际机场","arrivalTerminal":"T3航站楼","duration":"2h30m","progress":"45%","gate":"B12","baggage":"5号转盘","checkinCounter":"A区10-15号","updateTime":"10分钟前更新"}}
</customtag>`,
      },
    ],
  },
  {
    id: 4,
    type: SessionMessageType.AGENT,
    status: SessionMessageStatus.SUCCEED,
    agentId: AgentId,
    gmtCreate: new Date().toISOString(),
    gmtModified: new Date().toISOString(),
    contents: [
      {
        type: ContentType.TEXT,
        text: `<customtag type="FlightStatus" placeholder="正在查询航班动态...">
{"flight":{"flightNo":"MU5678","airline":"中国东方航空","status":"延误","departureTime":"14:20","departureCity":"上海","departureAirport":"上海浦东国际机场","departureTerminal":"T1航站楼","arrivalTime":"16:50","arrivalCity":"广州","arrivalAirport":"广州白云国际机场","arrivalTerminal":"T2航站楼","duration":"2h30m","gate":"待定","checkinCounter":"D区20-25号","delayReason":"天气原因，预计延误30分钟","updateTime":"5分钟前更新"}}
</customtag>`,
      },
    ],
  },
];

export const calendarMockMessages: Array<UserSessionMessage | AgentSessionMessage> = [
  {
    id: 5,
    type: SessionMessageType.AGENT,
    status: SessionMessageStatus.SUCCEED,
    agentId: AgentId,
    gmtCreate: new Date().toISOString(),
    gmtModified: new Date().toISOString(),
    contents: [
      {
        type: ContentType.TEXT,
        text: `<customtag type="Calendar" placeholder="正在加载日历...">
{"year":2026,"month":"2026年2月","monthNum":2,"events":[{"day":9,"type":"meeting","title":"团队周会","time":"10:00-11:00","description":"讨论本周工作进展和下周计划"},{"day":10,"type":"task","title":"完成项目文档","time":"全天","description":"整理并完善项目技术文档"},{"day":12,"type":"reminder","title":"缴纳水电费","time":"18:00前","description":"记得在线缴纳本月水电费"},{"day":14,"type":"event","title":"情人节","time":"全天","description":"提前预定餐厅"},{"day":15,"type":"meeting","title":"产品评审会","time":"14:00-16:00","description":"评审下一版本的产品功能"},{"day":18,"type":"deadline","title":"季度报告截止","time":"17:00前","description":"提交Q1季度工作总结报告"},{"day":20,"type":"task","title":"代码审查","time":"15:00-17:00","description":"审查新功能的代码实现"},{"day":22,"type":"meeting","title":"客户沟通会","time":"10:00-12:00","description":"与客户讨论需求变更"},{"day":25,"type":"reminder","title":"体检预约","time":"09:00","description":"年度体检预约提醒"},{"day":28,"type":"event","title":"元宵节","time":"全天","description":"传统佳节"}]}
</customtag>`,
      },
    ],
  },
];
