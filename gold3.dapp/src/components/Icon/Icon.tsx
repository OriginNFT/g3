// Hand-written 24x24 stroke glyphs instead of an icon package. currentColor
// everywhere, so a link or a disabled control tints the glyph with its text.

const PATHS = {
    home: "M3 10.5 12 3l9 7.5M5.5 9.4V20h13V9.4",
    power: "M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4ZM12 8.2l3.3 1.9v3.8L12 15.8l-3.3-1.9v-3.8Z",
    liquidity:
        "M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6ZM12 8.3l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4Z",
    community: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c.8-3.6 3.8-6 7.5-6s6.7 2.4 7.5 6",
    nft: "M3.5 8.5h17v4h-17zM5 12.5V20h14v-7.5M12 8.5V20M12 8.5C10.5 5 6.5 4.5 6.5 7S10 8.5 12 8.5Zm0 0c1.5-3.5 5.5-4 5.5-1.5S14 8.5 12 8.5Z",
    assets: "M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3M3 7.5V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.5M21 14.5h-3.5a2.5 2.5 0 0 1 0-5H21z",
    docs: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
    globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z",
    chevronDown: "m6 9 6 6 6-6",
    chevronRight: "m9 6 6 6-6 6",
    arrowRight: "M5 12h14M13 6l6 6-6 6",
    arrowLeft: "M19 12H5M11 6l-6 6 6 6",
    menu: "M4 7h16M4 12h16M4 17h16",
    refresh: "M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4",
    copy: "M9 9h11v11H9zM5 15H4V4h11v1",
    info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 7.5v.5",
    users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.6-3.2 3.2-5.5 6.5-5.5s5.9 2.3 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.6 3.5 5.2",
    chart: "M4 20h16M7 16v-5M12 16V7M17 16v-8",
    coins: "M9 10c3.3 0 6-1.1 6-2.5S12.3 5 9 5 3 6.1 3 7.5 5.7 10 9 10ZM3 7.5v8C3 16.9 5.7 18 9 18s6-1.1 6-2.5v-8M3 11.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5M15 10.5c3.3 0 6 1.1 6 2.5v4c0 1.4-2.7 2.5-6 2.5",
    swap: "M4 8h14l-3-3M20 16H6l3 3",
    layers: "m12 3 9 5-9 5-9-5ZM3 13l9 5 9-5",
    pie: "M12 3v9h9a9 9 0 1 1-9-9ZM15 3.5A9 9 0 0 1 20.5 9H15Z",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
    shield: "M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6Z",
    crown: "M3.5 8 7.5 12 12 5l4.5 7 4-4-1.8 10H5.3Z",
    sprout: "M12 21v-8M12 13c0-4-3-6.5-7-6.5 0 4 3 6.5 7 6.5ZM12 11c0-3.5 2.6-6 6.5-6 0 3.5-2.6 6-6.5 6Z",
    drop: "M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z",
    share: "M18 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.2 10.8l7.6-4.3M8.2 13.2l7.6 4.3",
    trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
    database:
        "M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3ZM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
    eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    plus: "M12 5v14M5 12h14",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1",
    x: "M4 4h4.5L20 20h-4.5ZM20 4l-6.5 7M4 20l6.5-7",
    telegram: "M21 4 3 11l6 2.2L18 7l-7 7.5.5 5.5 3-3.6 4.5 3.1Z",
    more: "M6 12h.01M12 12h.01M18 12h.01",
    lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
    book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5",
    question:
        "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.5",
    scale: "M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a2.5 2.5 0 0 0 5 0ZM19 8l-2.5 6a2.5 2.5 0 0 0 5 0Z",
    megaphone: "M4 10v4h3l7 4V6L7 10ZM17.5 9.5a3.5 3.5 0 0 1 0 5",
};

export type IconName = keyof typeof PATHS;

type Props = {
    name: IconName;
    size?: number;
    className?: string;
};

function Icon({ name, size = 20, className }: Props) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={name === "more" ? 3 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[name]} />
        </svg>
    );
}

export default Icon;
