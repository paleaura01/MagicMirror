<script>
    import { onMount } from 'svelte';
    import dayjs from 'dayjs';
    import './calendar_styles.css';

    import Fa from 'svelte-fa';
    import {
        faMedal,
        faDrumstickBite,
        faTree,
        faGlassCheers,
        faUserTie,
        faMonument,
        faPray,
        faChurch,
        faFlagUsa,
        faHandHoldingHeart,
        faCalendarAlt,
    } from '@fortawesome/free-solid-svg-icons';

    export let maximumEntries = 10;
    export let icsFilePath = '/ical/US_Holidays.ics';
    let events = [];
    let currentMonth = dayjs().month();
    let currentYear = dayjs().year();
    let days = [];

    // Debugging: Log changes to the current month and year
    function logMonthChange(action) {
        console.log(`[CalendarModule] ${action}: ${dayjs().month(currentMonth).year(currentYear).format('MMMM YYYY')}`);
    }

    onMount(() => {
        loadCalendarData();
        generateCalendarDays();
    });

    async function loadCalendarData() {
        try {
            const res = await fetch(icsFilePath);
            if (!res.ok || !res.headers.get('content-type')?.includes('text/calendar')) {
                console.error(`Failed to load calendar data from ${icsFilePath} or invalid content type.`);
                return;
            }
            const data = await res.text();
            parseCalendarData(data);
        } catch (error) {
            console.error(`Error loading calendar data: ${error.message}`);
        }
    }

    function parseCalendarData(data) {
        const lines = data.split('\n');
        let currentEvent = null;
        let inEvent = false;

        lines.forEach((line) => {
            line = line.trim();
            if (line.startsWith('BEGIN:VEVENT')) {
                inEvent = true;
                currentEvent = { title: '', start: '' };
            } else if (line.startsWith('END:VEVENT')) {
                inEvent = false;
                if (currentEvent && currentEvent.start) {
                    events.push(currentEvent);
                }
                currentEvent = null;
            } else if (inEvent) {
                if (line.startsWith('SUMMARY:')) {
                    currentEvent.title = line.replace('SUMMARY:', '').trim();
                } else if (line.startsWith('DTSTART')) {
                    const dateString = line.includes(':') ? line.split(':')[1].trim() : '';
                    currentEvent.start = dayjs(dateString);
                }
            }
        });

        events = events
            .filter((event) => dayjs(event.start).isAfter(dayjs()))
            .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))
            .slice(0, maximumEntries);
    }

    function generateCalendarDays() {
        const startOfMonth = dayjs(`${currentYear}-${currentMonth + 1}-01`).startOf('month');
        const startDay = startOfMonth.day();
        const daysInMonth = startOfMonth.daysInMonth();

        days = Array.from({ length: daysInMonth + startDay }, (_, i) => {
            return i >= startDay ? i - startDay + 1 : null;
        });
    }

    function isToday(day) {
        return dayjs().isSame(dayjs(`${currentYear}-${currentMonth + 1}-${day}`), 'day');
    }

    function isPastDay(day) {
        return dayjs(`${currentYear}-${currentMonth + 1}-${day}`).isBefore(dayjs(), 'day');
    }

    function daysUntil(event) {
        return dayjs(event.start).diff(dayjs(), 'days');
    }

    function getFadeOpacity(index) {
        const baseOpacity = 1;
        const fadeStep = 0.1;
        return baseOpacity - index * fadeStep;
    }

    function goToPreviousMonth() {
        currentMonth -= 1;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear -= 1;
        }
        logMonthChange("Moved to previous month");
        generateCalendarDays();
    }

    function goToNextMonth() {
        currentMonth += 1;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear += 1;
        }
        logMonthChange("Moved to next month");
        generateCalendarDays();
    }

    function getEventIcon(title) {
        switch (title) {
            case 'Veterans Day':
                return faMedal;
            case 'Thanksgiving Day':
                return faDrumstickBite;
            case 'Christmas':
                return faTree;
            case "New Year's Day":
                return faGlassCheers;
            case 'M L King Day':
                return faUserTie;
            case "Presidents' Day":
                return faMonument;
            case 'Good Friday':
                return faPray;
            case 'Easter Sunday':
                return faChurch;
            case 'Memorial Day':
                return faFlagUsa;
            case 'Juneteenth':
                return faFlagUsa;
            case 'Independence Day':
                return faFlagUsa;
            case 'Labor Day':
                return faUserTie;
            case 'Columbus Day':
                return faMonument;
            default:
                return faCalendarAlt;
        }
    }
</script>

<div class="calendar-module-wrapper">
    <div class="calendar-container">
        <div class="calendar-header">
            <span
                role="button"
                tabindex="0"
                class="prev-month"
                on:click={goToPreviousMonth}
                on:keydown={(e) => e.key === 'Enter' && goToPreviousMonth()}
            >
                &lt;
            </span>
            {dayjs().month(currentMonth).year(currentYear).format('MMMM YYYY')}
            <span
                role="button"
                tabindex="0"
                class="next-month"
                on:click={goToNextMonth}
                on:keydown={(e) => e.key === 'Enter' && goToNextMonth()}
            >
                &gt;
            </span>
        </div>

        <div class="calendar-border"></div>

        <div class="calendar-wrapper">
            <div class="calendar-grid">
                <div class="calendar-day-name">Sun</div>
                <div class="calendar-day-name">Mon</div>
                <div class="calendar-day-name">Tue</div>
                <div class="calendar-day-name">Wed</div>
                <div class="calendar-day-name">Thu</div>
                <div class="calendar-day-name">Fri</div>
                <div class="calendar-day-name">Sat</div>
                {#each days as day}
                    <div
                        class="calendar-day {isToday(day) ? 'today' : ''} {isPastDay(day) ? 'past-day' : ''}"
                    >
                        {day || ''}
                    </div>
                {/each}
            </div>
        </div>

        <div class="events-wrapper">
            <div class="upcoming-events-header">Upcoming Holidays</div>
            <ul class="event-list">
                {#each events as event, index}
                    <li class="event-item" style="opacity: {getFadeOpacity(index)};">
                        <Fa icon={getEventIcon(event.title)} class="event-icon" />
                        <span class="event-title">{event.title}</span>
                        <span class="event-time">In {daysUntil(event)} days</span>
                    </li>
                {/each}
            </ul>
        </div>
    </div>
</div>
