import { describe, it, expect } from 'vitest';

import {
  EVENT_NAMES,
  EVENT_CATEGORIES,
  EVENT_CATEGORY_MAP,
  BILLING_RATES,
  SESSION_CONFIG,
  CONSENT_CONFIG,
  SCROLL_THRESHOLDS,
  DEBOUNCE_INTERVALS,
} from '../constants';

describe('Constants', () => {
  describe('EVENT_NAMES', () => {
    it('should have all map event names', () => {
      expect(EVENT_NAMES.MAP_LOADED).toBe('map_loaded');
      expect(EVENT_NAMES.MAP_INITIAL_RENDER).toBe('map_initial_render');
      expect(EVENT_NAMES.MAP_TILE_LOAD).toBe('map_tile_load');
      expect(EVENT_NAMES.MAP_MARKER_CLICK).toBe('map_marker_click');
      expect(EVENT_NAMES.MAP_MARKER_HOVER).toBe('map_marker_hover');
      expect(EVENT_NAMES.MAP_FILTER_TOGGLE).toBe('map_filter_toggle');
      expect(EVENT_NAMES.MAP_ZOOM).toBe('map_zoom');
      expect(EVENT_NAMES.MAP_PAN).toBe('map_pan');
      expect(EVENT_NAMES.MAP_SEARCH).toBe('map_search');
      expect(EVENT_NAMES.MAP_ROUTE_PLAN).toBe('map_route_plan');
      expect(EVENT_NAMES.MAP_LIST_MODAL_OPEN).toBe('map_list_modal_open');
      expect(EVENT_NAMES.MAP_LIST_ITEM_CLICK).toBe('map_list_item_click');
      expect(EVENT_NAMES.MAP_CITY_SELECT).toBe('map_city_select');
    });

    it('should have all construction event names', () => {
      expect(EVENT_NAMES.CONSTRUCTION_VIEW).toBe('construction_view');
      expect(EVENT_NAMES.CONSTRUCTION_CTA_CLICK).toBe('construction_cta_click');
      expect(EVENT_NAMES.CONSTRUCTION_PHONE_REVEAL).toBe('construction_phone_reveal');
      expect(EVENT_NAMES.CONSTRUCTION_DOWNLOAD).toBe('construction_download');
      expect(EVENT_NAMES.CONSTRUCTION_SHARE).toBe('construction_share');
      expect(EVENT_NAMES.CONSTRUCTION_GALLERY_VIEW).toBe('construction_gallery_view');
      expect(EVENT_NAMES.CONSTRUCTION_GALLERY_IMAGE).toBe('construction_gallery_image');
      expect(EVENT_NAMES.CONSTRUCTION_SCROLL_DEPTH).toBe('construction_scroll_depth');
      expect(EVENT_NAMES.CONSTRUCTION_RELATED_CLICK).toBe('construction_related_click');
      expect(EVENT_NAMES.CONSTRUCTION_VIDEO_PLAY).toBe('construction_video_play');
      expect(EVENT_NAMES.CONSTRUCTION_VIRTUAL_TOUR).toBe('construction_virtual_tour');
    });

    it('should have all construction CRUD event names', () => {
      expect(EVENT_NAMES.CONSTRUCTION_CREATED).toBe('construction_created');
      expect(EVENT_NAMES.CONSTRUCTION_UPDATED).toBe('construction_updated');
      expect(EVENT_NAMES.CONSTRUCTION_DELETED).toBe('construction_deleted');
      expect(EVENT_NAMES.CONSTRUCTION_STATUS_CHANGE).toBe('construction_status_change');
      expect(EVENT_NAMES.CONSTRUCTION_PROGRESS_UPDATE).toBe('construction_progress_update');
      expect(EVENT_NAMES.CONSTRUCTION_APPROVAL_SUBMIT).toBe('construction_approval_submit');
      expect(EVENT_NAMES.CONSTRUCTION_APPROVED).toBe('construction_approved');
      expect(EVENT_NAMES.CONSTRUCTION_REJECTED).toBe('construction_rejected');
      expect(EVENT_NAMES.CONSTRUCTION_PUBLISHED).toBe('construction_published');
    });

    it('should have all suggestion event names', () => {
      expect(EVENT_NAMES.SUGGESTION_SUBMITTED).toBe('suggestion_submitted');
      expect(EVENT_NAMES.SUGGESTION_REVIEW_STARTED).toBe('suggestion_review_started');
      expect(EVENT_NAMES.SUGGESTION_APPROVED).toBe('suggestion_approved');
      expect(EVENT_NAMES.SUGGESTION_REJECTED).toBe('suggestion_rejected');
      expect(EVENT_NAMES.SUGGESTION_MERGED).toBe('suggestion_merged');
      expect(EVENT_NAMES.SUGGESTION_CHANGES_REQUESTED).toBe('suggestion_changes_requested');
    });

    it('should have all user event names', () => {
      expect(EVENT_NAMES.USER_LOGIN).toBe('user_login');
      expect(EVENT_NAMES.USER_LOGOUT).toBe('user_logout');
      expect(EVENT_NAMES.USER_REGISTER).toBe('user_register');
      expect(EVENT_NAMES.USER_PROFILE_UPDATE).toBe('user_profile_update');
    });

    it('should have all sponsor event names', () => {
      expect(EVENT_NAMES.SPONSOR_IMPRESSION).toBe('sponsor_impression');
      expect(EVENT_NAMES.SPONSOR_CLICK).toBe('sponsor_click');
      expect(EVENT_NAMES.SPONSOR_LEAD_SUBMIT).toBe('sponsor_lead_submit');
    });

    it('should have all system event names', () => {
      expect(EVENT_NAMES.API_CALL).toBe('api_call');
      expect(EVENT_NAMES.ERROR_OCCURRED).toBe('error_occurred');
      expect(EVENT_NAMES.PAGE_PERFORMANCE).toBe('page_performance');
    });
  });

  describe('EVENT_CATEGORIES', () => {
    it('should have all categories', () => {
      expect(EVENT_CATEGORIES.MAP).toBe('map');
      expect(EVENT_CATEGORIES.CONSTRUCTION).toBe('construction');
      expect(EVENT_CATEGORIES.SUGGESTION).toBe('suggestion');
      expect(EVENT_CATEGORIES.USER).toBe('user');
      expect(EVENT_CATEGORIES.SPONSOR).toBe('sponsor');
      expect(EVENT_CATEGORIES.SYSTEM).toBe('system');
    });
  });

  describe('EVENT_CATEGORY_MAP', () => {
    it('should map all map events to map category', () => {
      const mapEvents = [
        'map_loaded',
        'map_initial_render',
        'map_tile_load',
        'map_marker_click',
        'map_marker_hover',
        'map_filter_toggle',
        'map_zoom',
        'map_pan',
        'map_search',
        'map_route_plan',
        'map_list_modal_open',
        'map_list_item_click',
        'map_city_select',
      ];

      mapEvents.forEach((event) => {
        expect(EVENT_CATEGORY_MAP[event]).toBe('map');
      });
    });

    it('should map all construction events to construction category', () => {
      const constructionEvents = [
        'construction_view',
        'construction_cta_click',
        'construction_phone_reveal',
        'construction_download',
        'construction_share',
        'construction_gallery_view',
        'construction_gallery_image',
        'construction_scroll_depth',
        'construction_related_click',
        'construction_video_play',
        'construction_virtual_tour',
        'construction_created',
        'construction_updated',
        'construction_deleted',
        'construction_status_change',
        'construction_progress_update',
        'construction_approval_submit',
        'construction_approved',
        'construction_rejected',
        'construction_published',
      ];

      constructionEvents.forEach((event) => {
        expect(EVENT_CATEGORY_MAP[event]).toBe('construction');
      });
    });

    it('should map all suggestion events to suggestion category', () => {
      const suggestionEvents = [
        'suggestion_submitted',
        'suggestion_review_started',
        'suggestion_approved',
        'suggestion_rejected',
        'suggestion_merged',
        'suggestion_changes_requested',
      ];

      suggestionEvents.forEach((event) => {
        expect(EVENT_CATEGORY_MAP[event]).toBe('suggestion');
      });
    });

    it('should map all user events to user category', () => {
      const userEvents = ['user_login', 'user_logout', 'user_register', 'user_profile_update'];

      userEvents.forEach((event) => {
        expect(EVENT_CATEGORY_MAP[event]).toBe('user');
      });
    });

    it('should map all sponsor events to sponsor category', () => {
      const sponsorEvents = ['sponsor_impression', 'sponsor_click', 'sponsor_lead_submit'];

      sponsorEvents.forEach((event) => {
        expect(EVENT_CATEGORY_MAP[event]).toBe('sponsor');
      });
    });

    it('should map all system events to system category', () => {
      const systemEvents = ['api_call', 'error_occurred', 'page_performance'];

      systemEvents.forEach((event) => {
        expect(EVENT_CATEGORY_MAP[event]).toBe('system');
      });
    });
  });

  describe('BILLING_RATES', () => {
    it('should have correct billing rates for sponsor events', () => {
      expect(BILLING_RATES.sponsor_impression).toBe(10); // 10 VND
      expect(BILLING_RATES.sponsor_click).toBe(100); // 100 VND
      expect(BILLING_RATES.sponsor_lead_submit).toBe(5000); // 5,000 VND
    });

    it('should only have sponsor events with billing rates', () => {
      const billingEventNames = Object.keys(BILLING_RATES);

      billingEventNames.forEach((event) => {
        expect(event.startsWith('sponsor_')).toBe(true);
      });
    });

    it('should have positive rates for all billable events', () => {
      Object.values(BILLING_RATES).forEach((rate) => {
        expect(rate).toBeGreaterThan(0);
      });
    });
  });

  describe('SESSION_CONFIG', () => {
    it('should have 30 minute timeout', () => {
      expect(SESSION_CONFIG.TIMEOUT).toBe(30 * 60 * 1000); // 30 minutes in ms
    });

    it('should have correct storage keys', () => {
      expect(SESSION_CONFIG.SESSION_KEY).toBe('ua_session_id');
      expect(SESSION_CONFIG.LAST_ACTIVITY_KEY).toBe('ua_last_activity');
      expect(SESSION_CONFIG.ANONYMOUS_KEY).toBe('ua_anonymous_id');
    });

    it('should have unique storage keys', () => {
      const keys = [
        SESSION_CONFIG.SESSION_KEY,
        SESSION_CONFIG.LAST_ACTIVITY_KEY,
        SESSION_CONFIG.ANONYMOUS_KEY,
      ];

      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe('CONSENT_CONFIG', () => {
    it('should have correct storage key', () => {
      expect(CONSENT_CONFIG.STORAGE_KEY).toBe('ua_consent');
    });
  });

  describe('SCROLL_THRESHOLDS', () => {
    it('should have correct thresholds', () => {
      expect(SCROLL_THRESHOLDS).toEqual([25, 50, 75, 100]);
    });

    it('should be sorted in ascending order', () => {
      for (let i = 1; i < SCROLL_THRESHOLDS.length; i++) {
        expect(SCROLL_THRESHOLDS[i]).toBeGreaterThan(SCROLL_THRESHOLDS[i - 1]);
      }
    });

    it('should have 100 as the maximum threshold', () => {
      expect(SCROLL_THRESHOLDS[SCROLL_THRESHOLDS.length - 1]).toBe(100);
    });
  });

  describe('DEBOUNCE_INTERVALS', () => {
    it('should have correct debounce intervals', () => {
      expect(DEBOUNCE_INTERVALS.HOVER).toBe(500);
      expect(DEBOUNCE_INTERVALS.ZOOM).toBe(300);
      expect(DEBOUNCE_INTERVALS.PAN).toBe(500);
      expect(DEBOUNCE_INTERVALS.SCROLL).toBe(200);
    });

    it('should have positive intervals', () => {
      Object.values(DEBOUNCE_INTERVALS).forEach((interval) => {
        expect(interval).toBeGreaterThan(0);
      });
    });
  });

  describe('consistency checks', () => {
    it('should have EVENT_CATEGORY_MAP entry for each EVENT_NAME', () => {
      const allEventNames = Object.values(EVENT_NAMES);

      allEventNames.forEach((eventName) => {
        expect(EVENT_CATEGORY_MAP[eventName]).toBeDefined();
        expect(Object.values(EVENT_CATEGORIES)).toContain(EVENT_CATEGORY_MAP[eventName]);
      });
    });

    it('should use snake_case for all event names', () => {
      const allEventNames = Object.values(EVENT_NAMES);

      allEventNames.forEach((eventName) => {
        expect(eventName).toMatch(/^[a-z]+(_[a-z]+)*$/);
      });
    });

    it('should use snake_case for all category names', () => {
      const allCategories = Object.values(EVENT_CATEGORIES);

      allCategories.forEach((category) => {
        expect(category).toMatch(/^[a-z]+$/);
      });
    });
  });
});
