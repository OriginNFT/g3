import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";

import Icon from "src/components/Icon/Icon";
import { locales, selectLocale } from "src/locales";

// The language picker at the foot of the sidebar and under the brand in the
// drawer: a native select, so the phone opens its own picker.

function LocaleSwitch() {
    const { i18n } = useLingui();
    return (
        <label className="gp-locale">
            <Icon name="globe" size={18} />
            <select value={i18n.locale} onChange={event => selectLocale(event.target.value)} aria-label={t`語言`}>
                {Object.entries(locales).map(([key, locale]) => (
                    <option key={key} value={key}>
                        {locale.label}
                    </option>
                ))}
            </select>
            <Icon name="chevronDown" size={16} />
        </label>
    );
}

export default LocaleSwitch;
