

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../components/Icon';
import Button from '../components/Button';
import CenteredMessage from '../components/CenteredMessage';

interface CalendarEvent {
    date?: string; // For fixed YYYY-MM-DD
    gregorianDate?: string; // For recurring MM-DD
    title_en: string;
}

const CalendarView = () => {
    const { t } = useTranslation(['common', 'calendar']);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => window.innerWidth <= 767 ? 'list' : 'grid');

    useEffect(() => {
        fetch('/data/events.json')
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to fetch events');
                }
                return res.json();
            })
            .then(data => setEvents(data.events || []))
            .catch(err => console.error("Failed to load calendar events:", err));
    }, []);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleGoToToday = () => {
        setCurrentDate(new Date());
    };

    const daysOfWeek = useMemo(() => {
        const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
        // Start from a known Sunday
        const startDate = new Date(2024, 7, 4);
        return [...Array(7).keys()].map(i => {
            const day = new Date(startDate);
            day.setDate(day.getDate() + i);
            return formatter.format(day);
        });
    }, []);

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();

        // 0 = Sunday, 1 = Monday, etc.
        const startDayOfWeek = firstDayOfMonth.getDay();

        const grid = [];
        const prevMonthLastDay = new Date(year, month, 0);

        // Days from previous month
        for (let i = startDayOfWeek; i > 0; i--) {
            const dayDate = new Date(prevMonthLastDay);
            dayDate.setDate(prevMonthLastDay.getDate() - i + 1);
            grid.push({ date: dayDate, isCurrentMonth: false });
        }

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        // Days from next month
        const nextMonthDays = 42 - grid.length; // Fill up to 6 rows
        for (let i = 1; i <= nextMonthDays; i++) {
            grid.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return grid;
    }, [currentDate]);

    const today = new Date();
    const dayFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', { day: 'numeric' }), []);
    const monthYearFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }), []);

    const monthEvents = useMemo(() => {
        const currentMonthDays = calendarGrid.filter(d => d.isCurrentMonth);
        const eventsByDay = new Map<string, { date: Date, events: CalendarEvent[] }>();

        currentMonthDays.forEach(day => {
            const gregorianDateString = day.date.toISOString().slice(0, 10);
            const gregorianRecurringString = gregorianDateString.slice(5); // "MM-DD"

            const dayEvents = events.filter(event => 
                (event.date && event.date === gregorianDateString) ||
                (event.gregorianDate && event.gregorianDate === gregorianRecurringString)
            );

            if (dayEvents.length > 0) {
                const dayKey = day.date.toISOString().slice(0, 10);
                if (!eventsByDay.has(dayKey)) {
                    eventsByDay.set(dayKey, { date: day.date, events: [] });
                }
                eventsByDay.get(dayKey)!.events.push(...dayEvents);
            }
        });

        return Array.from(eventsByDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [calendarGrid, events]);

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <div className="calendar-nav">
                    <Button onClick={handlePrevMonth} className="btn-secondary">
                        <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                        <span className="btn-text">{t('prevMonth', { ns: 'calendar' })}</span>
                    </Button>
                    <h2>{monthYearFormatter.format(currentDate)}</h2>
                    <Button onClick={handleNextMonth} className="btn-secondary">
                        <span className="btn-text">{t('nextMonth', { ns: 'calendar' })}</span>
                        <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                    </Button>
                </div>
                <div className="header-actions">
                    <div className="view-switcher">
                        <button onClick={() => setViewMode('grid')} className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`} aria-label={t('gridView', { ns: 'calendar' })}>
                            <Icon>{ICONS.DASHBOARD}</Icon>
                        </button>
                        <button onClick={() => setViewMode('list')} className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`} aria-label={t('listView', { ns: 'calendar' })}>
                            <Icon>{ICONS.EMAIL_LISTS}</Icon>
                        </button>
                    </div>
                    <Button onClick={handleGoToToday} className="btn-secondary">{t('today', { ns: 'calendar' })}</Button>
                </div>
            </div>
            
            {viewMode === 'grid' && (
                <div className="calendar-grid-wrapper">
                    <div className="calendar-grid">
                        {daysOfWeek.map(day => (
                            <div key={day} className="calendar-day-header">{day}</div>
                        ))}
                        {calendarGrid.map((item, index) => {
                            const dayNumber = dayFormatter.format(item.date);
                            const isToday = item.isCurrentMonth &&
                                        item.date.getDate() === today.getDate() &&
                                        item.date.getMonth() === today.getMonth() &&
                                        item.date.getFullYear() === today.getFullYear();
                            
                            const dayClasses = `calendar-day ${!item.isCurrentMonth ? 'is-other-month' : ''} ${isToday ? 'is-today' : ''}`;

                            const gregorianDateString = item.date.toISOString().slice(0, 10);
                            const gregorianRecurringString = gregorianDateString.slice(5); // "MM-DD"

                            const dayEvents = events.filter(event => 
                                (event.date && event.date === gregorianDateString) ||
                                (event.gregorianDate && event.gregorianDate === gregorianRecurringString)
                            );

                            return (
                                <div key={index} className={dayClasses}>
                                    <span className="day-number">{dayNumber}</span>
                                    <div className="day-events">
                                        {dayEvents.map((event, eventIndex) => (
                                            <div key={eventIndex} className="event-badge">
                                                {event.title_en}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {viewMode === 'list' && (
                <div className="calendar-list-view">
                    {monthEvents.length > 0 ? (
                        monthEvents.map(({ date, events: dayEventsList }) => (
                            <div key={date.toISOString()} className="list-day-group">
                                <div className="list-day-header">
                                    {new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric' }).format(date)}
                                </div>
                                <div className="list-day-events">
                                    {dayEventsList.map((event, index) => (
                                        <div key={index} className="event-badge">
                                            {event.title_en}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <CenteredMessage style={{minHeight: '400px'}}>
                            <p>{t('noEventsThisMonth', { ns: 'calendar' })}</p>
                        </CenteredMessage>
                    )}
                </div>
            )}
        </div>
    );
};

export default CalendarView;