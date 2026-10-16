import { registerLocaleData } from '@angular/common';
import localeNl from '@angular/common/locales/nl';
import { useTranslations } from './app/core/i18n/i18n';
import nl from './app/core/i18n/translations/nl';

// Tests draaien in het Nederlands, de brontaal.
registerLocaleData(localeNl);
useTranslations('nl', nl);
