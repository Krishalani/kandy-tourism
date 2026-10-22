import { Injectable } from '@angular/core';
import { ABOUT_IMAGE, HERO_IMAGE, SITE_INFO } from '../data/site-content';
import { SiteInfo } from '../models/site-info.model';

/** Static site content. Could later be served by a CMS or the Web API. */
@Injectable({ providedIn: 'root' })
export class SiteInfoService {
  readonly info: SiteInfo = SITE_INFO;
  readonly heroImage = HERO_IMAGE;
  readonly aboutImage = ABOUT_IMAGE;
}
