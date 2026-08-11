import React, { useState, useEffect } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { 
  AppRoot, 
  ConfigProvider, 
  Panel, 
  PanelHeader, 
  Group, 
  Card, 
  Tabs, 
  TabsItem,
  Div,
  Header,
  Text,
  Title,
  Footnote,
  Input,
  Button
} from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';
import ChartComponent from './ChartComponent';
import MiniChart from './MiniChart';

// Иконки для метрик
const IconLike = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 24C14 24 4 18 4 11C4 7 7 4 11 4C13 4 14 5 14 5C14 5 15 4 17 4C21 4 24 7 24 11C24 18 14 24 14 24Z" stroke="#E64646" strokeWidth="2"/>
  </svg>
);

const IconComment = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 10C5 6.68629 7.68629 4 11 4H17C20.3137 4 23 6.68629 23 10V16C23 19.3137 20.3137 22 17 22H14L10 25L10 22H11C7.68629 22 5 19.3137 5 16V10Z" stroke="#4BB34B" strokeWidth="2"/>
  </svg>
);

const IconRepost = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 13L5 11L7 9" stroke="#FF9A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 15V11C21 9.89543 20.1046 9 19 9H5" stroke="#FF9A00" strokeWidth="2" strokeLinecap="round"/>
    <path d="M21 19L23 17L21 15" stroke="#FF9A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 17V21C7 22.1046 7.89543 23 9 23H23" stroke="#FF9A00" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconView = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 8C10 8 7 10 5 14C7 18 10 20 14 20C18 20 21 18 23 14C21 10 18 8 14 8Z" stroke="#9B59B6" strokeWidth="2"/>
    <circle cx="14" cy="14" r="3" stroke="#9B59B6" strokeWidth="2"/>
  </svg>
);

function App() {
  // Состояние приложения
  const [activeTab, setActiveTab] = useState('today');
  const [inputUrl, setInputUrl] = useState('');
  const [groupId, setGroupId] = useState(null);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allPosts, setAllPosts] = useState([]);
  const [vkToken, setVkToken] = useState('');

  // Инициализация мини-приложения и получение токена
  useEffect(() => {
    bridge.send('VKWebAppInit')
      .then(() => {
        console.log('Мини-приложение инициализировано');
        return bridge.send('VKWebAppGetAuthToken', {
          app_id: 54686047,
          scope: 'groups,stats'
        });
      })
      .then((data) => {
        console.log('Токен получен');
        setVkToken(data.access_token);
      })
      .catch((e) => {
        console.warn('Ошибка инициализации или получения прав:', e);
      });
  }, []);

  // Функция для запросов к api вк через vk bridge с токеном
  const callVkApi = async (method, params) => {
    if (!vkToken) {
      throw new Error('Токен не получен');
    }
    
    try {
      const result = await bridge.send('VKWebAppCallAPIMethod', {
        method: method,
        params: { 
          ...params, 
          access_token: vkToken,
          v: '5.199' 
        }
      });
      
      console.log('Ответ ' + method + ':', result);
      
      if (result.error) {
        throw new Error(result.error.error_msg || JSON.stringify(result.error));
      }
      return result;
    } catch (e) {
      console.error('Ошибка вызова ' + method + ':', e);
      throw e;
    }
  };

  // Получение постов со стены
  const fetchWallPosts = async (id, count = 100) => {
    try {
      const data = await callVkApi('wall.get', { 
        owner_id: -id, 
        count: Math.min(count, 100) 
      });
      return data.response?.items || [];
    } catch (e) {
      console.error('Ошибка получения постов:', e);
      throw e;
    }
  };

  // Расчёт всех метрик на основе постов
  const calculateMetricsFromPosts = (posts, period) => {
    if (!posts || posts.length === 0) {
      return {
        posts: 0,
        likes: 0,
        comments: 0,
        reposts: 0,
        views: 0,
        avgLikes: 0,
        avgComments: 0,
        avgReposts: 0,
        avgViews: 0,
        engagementRate: 0,
        qualityRate: 0,
        discussionRate: 0,
        viralityIndex: 0,
        conversionRate: 0,
        history: [],
        periodInfo: 'Нет постов за ' + (period === 'today' ? 'день' : period === 'week' ? 'неделю' : 'месяц')
      };
    }

    let totalLikes = 0;
    let totalComments = 0;
    let totalReposts = 0;
    let totalViews = 0;
    const historyData = [];

    posts.forEach(post => {
      const likes = post.likes?.count || 0;
      const comments = post.comments?.count || 0;
      const reposts = post.reposts?.count || 0;
      const views = post.views?.count || 0;

      totalLikes += likes;
      totalComments += comments;
      totalReposts += reposts;
      totalViews += views;

      historyData.push({
        date: new Date(post.date * 1000).toLocaleDateString(),
        likes,
        comments,
        reposts,
        views
      });
    });

    const count = posts.length;
    const periodText = period === 'today' ? 'день' : period === 'week' ? 'неделю' : 'месяц';
    
    const totalInteractions = totalLikes + totalComments + totalReposts;
    
    const qualityRate = (totalLikes + totalComments) > 0 
      ? Math.round((totalReposts / (totalLikes + totalComments)) * 100 * 10) / 10 
      : 0;
    const discussionRate = totalViews > 0 
      ? Math.round((totalComments / totalViews) * 100 * 10) / 10 
      : 0;
    const viralityIndex = (totalLikes + totalComments) > 0 
      ? Math.round((totalReposts / (totalLikes + totalComments)) * 10) / 10 
      : 0;
    const conversionRate = totalViews > 0 
      ? Math.round((totalInteractions / totalViews) * 100 * 10) / 10 
      : 0;

    return {
      posts: count,
      likes: totalLikes,
      comments: totalComments,
      reposts: totalReposts,
      views: totalViews,
      avgLikes: Math.round(totalLikes / count * 10) / 10,
      avgComments: Math.round(totalComments / count * 10) / 10,
      avgReposts: Math.round(totalReposts / count * 10) / 10,
      avgViews: Math.round(totalViews / count * 10) / 10,
      engagementRate: Math.round((totalLikes + totalComments + totalReposts) / count * 10) / 10,
      qualityRate: qualityRate,
      discussionRate: discussionRate,
      viralityIndex: viralityIndex,
      conversionRate: conversionRate,
      history: historyData.reverse(),
      periodInfo: count + ' постов за ' + periodText
    };
  };

  // Фильтрация постов по выбранному периоду
  const filterPostsByPeriod = (posts, period) => {
    if (!posts || posts.length === 0) return [];

    let days = 1;
    let periodLabel = 'день';
    if (period === 'week') { days = 7; periodLabel = 'неделю'; }
    else if (period === 'month') { days = 30; periodLabel = 'месяц'; }

    const now = Date.now() / 1000;
    const filtered = posts.filter(post => {
      const diff = (now - post.date) / 86400;
      return diff <= days;
    });

    console.log('Фильтрация за ' + periodLabel + ': найдено ' + filtered.length + ' постов из ' + posts.length);
    return filtered;
  };

  // Основная функция загрузки данных сообщества
  const loadCommunityData = async (url) => {
    setLoading(true);
    setError(null);
    setData(null);
    setHistory([]);

    try {
      let id;

      if (/^\d+$/.test(url.trim())) {
        id = parseInt(url.trim());
      } else {
        const clubMatch = url.match(/club(\d+)/);
        const publicMatch = url.match(/public(\d+)/);
        const photoMatch = url.match(/photo-(\d+)_/);
        
        if (clubMatch) id = parseInt(clubMatch[1]);
        else if (publicMatch) id = parseInt(publicMatch[1]);
        else if (photoMatch) id = parseInt(photoMatch[1]);
        else {
          const match = url.match(/(?:vk\.com|vk\.ru)\/([a-zA-Z0-9_]+)/);
          if (match) {
            const screenName = match[1];
            const resolveData = await callVkApi('utils.resolveScreenName', { screen_name: screenName });
            if (resolveData.response && resolveData.response.object_id) {
              id = resolveData.response.object_id;
            } else {
              throw new Error('Не удалось найти сообщество по адресу: ' + screenName);
            }
          } else {
            throw new Error('Не удалось распознать ссылку');
          }
        }
      }

      if (!id) throw new Error('Не удалось определить ID сообщества');

      setGroupId(id);

      const posts = await fetchWallPosts(id, 100);
      if (!posts || posts.length === 0) {
        throw new Error('Нет постов в этом сообществе');
      }

      setAllPosts(posts);

      const filteredPosts = filterPostsByPeriod(posts, activeTab);
      const metrics = calculateMetricsFromPosts(filteredPosts, activeTab);
      
      setData(metrics);
      setHistory(metrics?.history || []);
      setError(null);
      
      
    } catch (e) {
      setError(e.message || 'Произошла ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  // Обновление данных при смене вкладки
  useEffect(() => {
    if (allPosts.length > 0 && groupId) {
      const filteredPosts = filterPostsByPeriod(allPosts, activeTab);
      const metrics = calculateMetricsFromPosts(filteredPosts, activeTab);
      setData(metrics);
      setHistory(metrics?.history || []);
      setError(null);
      
    }
  }, [activeTab]);

  // Обработчик кнопки загрузки
  const handleLoad = () => {
    if (inputUrl.trim()) {
      loadCommunityData(inputUrl.trim());
    }
  };

  // Автозагрузка при старте
  useEffect(() => {
    const defaultId = '';
    setInputUrl(defaultId);
  }, []);

  return (
    <ConfigProvider>
      <AppRoot>
        <Panel>
          <PanelHeader>DashStatS</PanelHeader>
          
          <Group>
            <Div>
              <Title level="2" style={{ marginBottom: 8, color: '#5181B8', fontSize: 'clamp(18px, 4vw, 24px)' }}>
                Анализ статистики сообщества
              </Title>
              <Footnote style={{ color: '#818C99', fontSize: 'clamp(12px, 2vw, 14px)' }}>
                Вставьте ссылку или ID сообщества и нажмите «Загрузить»
              </Footnote>
            </Div>
          </Group>

          <Group>
            <Div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Input
                  style={{ flex: 1, minWidth: '150px' }}
                  type="text"
                  placeholder="https://vk.com/... или ID"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
                <Button onClick={handleLoad} style={{ flexShrink: 0 }}>
                  Загрузить
                </Button>
              </div>
            </Div>
          </Group>

          {loading && (
            <Group>
              <Div>
                <Text style={{ fontSize: 'clamp(14px, 2vw, 16px)' }}>Загрузка данных...</Text>
              </Div>
            </Group>
          )}

          {error && (
            <Group>
              <Div>
                <Text style={{ color: '#E64646', fontSize: 'clamp(13px, 2vw, 15px)' }}>{error}</Text>
              </Div>
            </Group>
          )}

          {data && (
            <>
              <Group>
                <Div>
                  <Title level="2" style={{ marginBottom: 4, fontSize: 'clamp(16px, 3vw, 20px)' }}>
                    Результат для введенного сообщества
                  </Title>
                  <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
                    ID: {groupId} • {data.periodInfo || data.posts + ' постов за период'}
                  </Footnote>
                  <Footnote style={{ color: '#4BB34B', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
                    Данные из открытых постов
                  </Footnote>
                </Div>
              </Group>

              <Group>
                <Tabs>
                  <TabsItem selected={activeTab === 'today'} onClick={() => setActiveTab('today')}>День</TabsItem>
                  <TabsItem selected={activeTab === 'week'} onClick={() => setActiveTab('week')}>Неделя</TabsItem>
                  <TabsItem selected={activeTab === 'month'} onClick={() => setActiveTab('month')}>Месяц</TabsItem>
                </Tabs>
              </Group>

              {/* Базовые метрики в сетке 2 на 1*/}
              <Group>
                <Div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: 12 
                }}>
                  <Card mode="shadow" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <IconLike />
                      <Text weight="2" style={{ marginLeft: 8, color: '#818C99', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Лайки</Text>
                    </div>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.likes}</Title>
                    <Footnote style={{ color: '#818C99', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      В среднем {data.avgLikes} на пост
                    </Footnote>
                  </Card>
                  
                  <Card mode="shadow" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <IconComment />
                      <Text weight="2" style={{ marginLeft: 8, color: '#818C99', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Комментарии</Text>
                    </div>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.comments}</Title>
                    <Footnote style={{ color: '#818C99', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      В среднем {data.avgComments} на пост
                    </Footnote>
                  </Card>

                  <Card mode="shadow" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <IconRepost />
                      <Text weight="2" style={{ marginLeft: 8, color: '#818C99', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Репосты</Text>
                    </div>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.reposts}</Title>
                    <Footnote style={{ color: '#818C99', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      В среднем {data.avgReposts} на пост
                    </Footnote>
                  </Card>

                  <Card mode="shadow" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <IconView />
                      <Text weight="2" style={{ marginLeft: 8, color: '#818C99', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Просмотры</Text>
                    </div>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.views}</Title>
                    <Footnote style={{ color: '#818C99', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      В среднем {data.avgViews} на пост
                    </Footnote>
                  </Card>
                </Div>
              </Group>

              {/* Продвинутые метрики */}
              <Group>
                <Div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: 12 
                }}>
                  <Card mode="shadow" style={{ padding: 16 }}>
                    <Text weight="2" style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      КОЭФФИЦИЕНТ ВОВЛЕЧЕНИЯ
                    </Text>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.engagementRate || 0}</Title>
                    <Footnote style={{ color: '#4BB34B', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      Взаимодействий на пост
                    </Footnote>
                  </Card>
                  
                  <Card mode="shadow" style={{ padding: 16 }}>
                    <Text weight="2" style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      КОЭФФИЦИЕНТ ПОЛЕЗНОГО ДЕЙСТВИЯ
                    </Text>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.qualityRate || 0}%</Title>
                    <Footnote style={{ color: '#FF9A00', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      Репосты / (лайки + комментарии)
                    </Footnote>
                  </Card>

                  <Card mode="shadow" style={{ padding: 16 }}>
                    <Text weight="2" style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      КОЭФФИЦИЕНТ ОБСУЖДЕНИЯ
                    </Text>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.discussionRate || 0}%</Title>
                    <Footnote style={{ color: '#9B59B6', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      Комментарии / просмотры
                    </Footnote>
                  </Card>

                  <Card mode="shadow" style={{ padding: 16 }}>
                    <Text weight="2" style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      ИНДЕКС ВИРАЛЬНОСТИ
                    </Text>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.viralityIndex || 0}</Title>
                    <Footnote style={{ color: '#E64646', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      {data.viralityIndex > 1 ? 'Контент распространяется быстрее' : 'Контент больше вовлекает'}
                    </Footnote>
                  </Card>
                  
                  <Card mode="shadow" style={{ padding: 16 }}>
                    <Text weight="2" style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      КОНВЕРСИЯ АУДИТОРИИ
                    </Text>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.conversionRate || 0}%</Title>
                    <Footnote style={{ color: '#5181B8', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      {data.conversionRate > 5 ? 'Высокая эффективность' : 
                       data.conversionRate > 2 ? 'Средняя эффективность' : 
                       'Низкая эффективность'}
                    </Footnote>
                  </Card>

                  <Card mode="shadow" style={{ padding: 16 }}>
                    <Text weight="2" style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      ВСЕГО ПОСТОВ
                    </Text>
                    <Title level="1" style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>{data.posts}</Title>
                    <Footnote style={{ color: '#4BB34B', fontSize: 'clamp(10px, 1.5vw, 13px)' }}>
                      За выбранный период
                    </Footnote>
                  </Card>
                </Div>
              </Group>

              {/* 4 графика в адаптивной сетке */}
              <Group header={<Header style={{ fontSize: 'clamp(14px, 2.5vw, 18px)' }}>Динамика активности</Header>}>
                <Div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: 16 
                }}>
                  <Card mode="shadow" style={{ padding: 12 }}>
                    <Text weight="2" style={{ marginBottom: 6, color: '#818C99', fontSize: 'clamp(12px, 2vw, 14px)' }}>
                      Лайки
                    </Text>
                    <div style={{ height: 'clamp(120px, 25vh, 180px)' }}>
                      <ChartComponent data={history} metric="likes" color="#E64646" label="Лайки" />
                    </div>
                  </Card>
                  <Card mode="shadow" style={{ padding: 12 }}>
                    <Text weight="2" style={{ marginBottom: 6, color: '#818C99', fontSize: 'clamp(12px, 2vw, 14px)' }}>
                      Комментарии
                    </Text>
                    <div style={{ height: 'clamp(120px, 25vh, 180px)' }}>
                      <ChartComponent data={history} metric="comments" color="#4BB34B" label="Комментарии" />
                    </div>
                  </Card>
                  <Card mode="shadow" style={{ padding: 12 }}>
                    <Text weight="2" style={{ marginBottom: 6, color: '#818C99', fontSize: 'clamp(12px, 2vw, 14px)' }}>
                      Репосты
                    </Text>
                    <div style={{ height: 'clamp(120px, 25vh, 180px)' }}>
                      <ChartComponent data={history} metric="reposts" color="#FF9A00" label="Репосты" />
                    </div>
                  </Card>
                  <Card mode="shadow" style={{ padding: 12 }}>
                    <Text weight="2" style={{ marginBottom: 6, color: '#818C99', fontSize: 'clamp(12px, 2vw, 14px)' }}>
                      Просмотры
                    </Text>
                    <div style={{ height: 'clamp(120px, 25vh, 180px)' }}>
                      <ChartComponent data={history} metric="views" color="#9B59B6" label="Просмотры" />
                    </div>
                  </Card>
                </Div>
              </Group>

              {/* Описание метрик */}
<Group header={<Header style={{ fontSize: 'clamp(14px, 2.5vw, 16px)' }}>Методология оценки эффективности контента</Header>}>
  
  <Div style={{ paddingLeft: 'clamp(12px, 2vw, 20px)' }}>
    {/* ER */}
    <div style={{ marginBottom: 20 }}>
      <Text weight="2" style={{ color: '#4BB34B', fontSize: 'clamp(13px, 2vw, 16px)' }}>ENGAGEMENT RATE (ER) — коэффициент вовлечения</Text>
      <Footnote style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Формула: (лайки + комментарии + репосты) / количество постов
      </Footnote>
      <Footnote style={{ fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Базовый показатель качества контента. Показывает среднее количество взаимодействий на один пост.
        {data.engagementRate > 50 && ' Значение выше 50: высокий уровень вовлечения.'}
        {data.engagementRate > 20 && data.engagementRate <= 50 && ' Значение в диапазоне 20–50: средний уровень вовлечения.'}
        {data.engagementRate <= 20 && ' Значение ниже 20: низкий уровень вовлечения.'}
      </Footnote>
      {data.engagementRate <= 20 ? (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#FFF3F3', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#E64646', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Рекомендация</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
            Контент не вызывает достаточного отклика у аудитории. Рекомендуется провести аудит текущего контент-плана, 
            протестировать новые форматы (опросы, видео, интерактивные посты) и увеличить частоту публикаций 
            в часы пиковой активности подписчиков. <br/>Целевое значение ER — выше 30.
          </Footnote>
        </Div>
      ) : (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#F0FFF4', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#4BB34B', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Статус</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>Показатель в норме</Footnote>
        </Div>
      )}
    </div>

    {/* QR */}
    <div style={{ marginBottom: 20 }}>
      <Text weight="2" style={{ color: '#FF9A00', fontSize: 'clamp(13px, 2vw, 16px)' }}>QUALITY RATE (QR) — коэффициент полезного действия</Text>
      <Footnote style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Формула: репосты / (лайки + комментарии) × 100%
      </Footnote>
      <Footnote style={{ fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Показывает долю репостов среди всех взаимодействий. Репост — сознательное действие, отражающее готовность пользователя рекомендовать контент.
        {data.qualityRate > 30 && ' Значение выше 30: высокий уровень лояльности ядра аудитории.'}
        {data.qualityRate > 15 && data.qualityRate <= 30 && ' Значение в диапазоне 15–30: средний уровень лояльности.'}
        {data.qualityRate <= 15 && ' Значение ниже 15: низкий уровень лояльности.'}
      </Footnote>
      {data.qualityRate <= 15 ? (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#FFF8F0', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#FF9A00', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Рекомендация</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
            Аудитория преимущественно пассивна и не готова рекомендовать контент другим. 
            Рекомендуется усилить производство полезного контента: гайды, чек-листы, экспертные подборки, 
            которые подписчики захотят сохранить или отправить друзьям. <br/>Целевое значение QR — выше 25.
          </Footnote>
        </Div>
      ) : (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#F0FFF4', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#4BB34B', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Статус</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>Показатель в норме</Footnote>
        </Div>
      )}
    </div>

    {/* DR */}
    <div style={{ marginBottom: 20 }}>
      <Text weight="2" style={{ color: '#9B59B6', fontSize: 'clamp(13px, 2vw, 16px)' }}>DISCUSSION RATE (DR) — коэффициент обсуждения</Text>
      <Footnote style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Формула: комментарии / просмотры × 100%
      </Footnote>
      <Footnote style={{ fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Показывает, какая часть аудитории готова вступать в диалог. Высокий показатель при низких лайках указывает на дискуссионный характер контента.
        {data.discussionRate > 2 && ' Значение выше 2: высокая дискуссионная активность.'}
        {data.discussionRate > 1 && data.discussionRate <= 2 && ' Значение в диапазоне 1–2: средняя дискуссионная активность.'}
        {data.discussionRate <= 1 && ' Значение ниже 1: низкая дискуссионная активность.'}
      </Footnote>
      {data.discussionRate <= 1 ? (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#F5F0FF', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#9B59B6', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Рекомендация</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
            Аудитория не вступает в диалог с контентом. Рекомендуется увеличить количество открытых вопросов 
            в постах, запускать опросы, просить подписчиков делиться мнением и реагировать на комментарии, 
            чтобы стимулировать обратную связь. <br/>Целевое значение DR — выше 1.5.
          </Footnote>
        </Div>
      ) : (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#F0FFF4', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#4BB34B', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Статус</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>Показатель в норме</Footnote>
        </Div>
      )}
    </div>

    {/* Virality Index */}
    <div style={{ marginBottom: 20 }}>
      <Text weight="2" style={{ color: '#E64646', fontSize: 'clamp(13px, 2vw, 16px)' }}>VIRALITY INDEX — индекс виральности</Text>
      <Footnote style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Формула: репосты / (лайки + комментарии)
      </Footnote>
      <Footnote style={{ fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Показывает соотношение распространения контента к его потреблению. Если значение выше 1.0 — контент эффективно распространяется за пределы целевой аудитории.
        {data.viralityIndex > 1 && ' Значение выше 1: контент распространяется органически.'}
        {data.viralityIndex > 0.5 && data.viralityIndex <= 1 && ' Значение в диапазоне 0.5–1: средний потенциал виральности.'}
        {data.viralityIndex <= 0.5 && ' Значение ниже 0.5: низкий потенциал виральности.'}
      </Footnote>
      {data.viralityIndex <= 0.5 ? (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#FFF3F3', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#E64646', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Рекомендация</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
            Контент не распространяется за пределы текущей аудитории. Рекомендуется создавать контент, 
            который пользователи захотят сохранить или отправить другим: полезные инструкции, 
            инфографику, подборки ресурсов, визуальные памятки. <br/>Целевое значение индекса — выше 0.7.
          </Footnote>
        </Div>
      ) : (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#F0FFF4', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#4BB34B', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Статус</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>Показатель в норме</Footnote>
        </Div>
      )}
    </div>

    {/* Audience Conversion */}
    <div style={{ marginBottom: 16 }}>
      <Text weight="2" style={{ color: '#5181B8', fontSize: 'clamp(13px, 2vw, 16px)' }}>AUDIENCE CONVERSION — конверсия аудитории</Text>
      <Footnote style={{ color: '#818C99', marginBottom: 4, fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Формула: (лайки + комментарии + репосты) / просмотры × 100%
      </Footnote>
      <Footnote style={{ fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        Показывает, какой процент аудитории, ознакомившейся с контентом, совершает целевое действие. Ключевая метрика эффективности контент-стратегии.
        {data.conversionRate > 5 && ' Значение выше 5: высокая эффективность контента.'}
        {data.conversionRate > 2 && data.conversionRate <= 5 && ' Значение в диапазоне 2–5: средняя эффективность.'}
        {data.conversionRate <= 2 && ' Значение ниже 2: низкая эффективность.'}
      </Footnote>
      {data.conversionRate <= 2 ? (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#F0F5FF', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#5181B8', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Рекомендация</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
            Контент не попадает в целевую аудиторию: просмотры есть, а взаимодействий — нет. 
            Рекомендуется проанализировать портрет текущей аудитории, скорректировать темы постов 
            и сделать контент более релевантным ожиданиям подписчиков. <br/>Целевое значение — выше 4.
          </Footnote>
        </Div>
      ) : (
        <Div style={{ marginTop: 8, padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)', background: '#F0FFF4', borderRadius: 6 }}>
          <Text weight="2" style={{ color: '#4BB34B', fontSize: 'clamp(12px, 1.8vw, 14px)' }}>Статус</Text>
          <Footnote style={{ color: '#818C99', fontSize: 'clamp(11px, 1.8vw, 14px)' }}>Показатель в норме</Footnote>
        </Div>
      )}
    </div>

    {/* Практические рекомендации */}
    <Div style={{ marginTop: 20, padding: 'clamp(12px, 2vw, 20px)', background: '#F5F7FA', borderRadius: 8 }}>
      <Text weight="2" style={{ marginBottom: 8, fontSize: 'clamp(14px, 2.5vw, 16px)' }}>
        Практические рекомендации
      </Text>
      <Footnote style={{ color: '#818C99', lineHeight: 1.6, fontSize: 'clamp(11px, 1.8vw, 14px)' }}>
        <strong>К чему стремиться:</strong><br/>
        • ER больше 30 — аудитория активно реагирует на контент<br/>
        • QR больше 25 — подписчики готовы рекомендовать ваш контент<br/>
        • DR больше 1.5 — люди хотят обсуждать ваши посты<br/>
        • Индекс виральности больше 0.7 — контент распространяется сам<br/>
        • Конверсия выше 4% — контент попадает в целевую аудиторию<br/><br/>
        
        <strong>Если большинство показателей ниже нормы:</strong><br/>
        • Начните с малого: возьмите один пост, который сработал лучше всего, и проанализируйте, что в нём было особенного<br/>
        • Спросите свою аудиторию: что им интересно? Проведите опрос<br/>
        • Посмотрите на конкурентов — что у них работает, а что нет?<br/><br/>
        
        <strong>Особые случаи:</strong><br/>
        • ER и QR высокие, а DR низкий → аудитория любит контент, но не хочет обсуждать. <br/>Попробуйте задавать больше открытых вопросов<br/>
        • Индекс виральности высокий, а QR низкий → контент распространяется, но не вызывает доверия. Проверьте качество информации
      </Footnote>
    </Div>
  </Div>
</Group>
            </>
          )}
        </Panel>
      </AppRoot>
    </ConfigProvider>
  );
}

export default App;