/// <reference path="../.astro/types.d.ts" />

import type { Market } from '~/lib/market';
import type { Localization } from '~/lib/shopify/types';

declare global {
  namespace App {
    interface Locals {
      /** Active localized market (country + language) for this request. */
      market: Market;
      /** Request-scoped localization promise (see getLocalizationOnce). */
      _localization?: Promise<Localization | null>;
    }
  }
}

export {};
