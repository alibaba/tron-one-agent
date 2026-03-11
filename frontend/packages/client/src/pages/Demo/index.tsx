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


import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { ChatBox } from 'chatbox/extends/ChatBox';
import SuggestHotelCard from './components/SuggestHotelCard';
import FlightCard from './components/FlightCard';
import FlightStatusCard from './components/FlightStatusCard';
import CalendarCard from './components/CalendarCard';
import {
  hotelMockMessages,
  flightMockMessages,
  flightStatusMockMessages,
  calendarMockMessages,
} from './mockData';
import styles from './index.module.less';

const { Sider, Content } = Layout;

const customTagMap = {
  SuggestHotel: SuggestHotelCard,
  Flight: FlightCard,
  FlightStatus: FlightStatusCard,
  Calendar: CalendarCard,
};

type DemoType = 'hotel' | 'flight' | 'flightStatus' | 'calendar';

const Demo: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<DemoType>('hotel');

  const getMessages = () => {
    switch (selectedKey) {
      case 'hotel':
        return hotelMockMessages;
      case 'flight':
        return flightMockMessages;
      case 'flightStatus':
        return flightStatusMockMessages;
      case 'calendar':
        return calendarMockMessages;
      default:
        return hotelMockMessages;
    }
  };

  const menuItems = [
    {
      key: 'customTag',
      label: 'CustomTag 组件',
      type: 'group' as const,
      children: [
        { key: 'hotel', label: '酒店推荐' },
        { key: 'flight', label: '航班列表' },
        { key: 'flightStatus', label: '航班动态' },
        { key: 'calendar', label: '日历日程' },
      ],
    },
  ];

  return (
    <Layout className={styles.container}>
      <Sider width={250} className={styles.sider}>
        <div className={styles.siderTitle}>示例</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => setSelectedKey(key as DemoType)}
          className={styles.menu}
        />
      </Sider>
      <Content className={styles.content}>
        <ChatBox
          messages={getMessages()}
          sessionName="CustomTag 演示"
          userName="演示用户"
          agentName="演示助手"
          handleSendMessage={async () => true}
          running={false}
          customTagMap={customTagMap}
        />
      </Content>
    </Layout>
  );
};

export default Demo;
