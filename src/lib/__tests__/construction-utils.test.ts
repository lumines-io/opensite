import { describe, it, expect } from 'vitest';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TYPE_LABELS,
  getStatusColor,
  getStatusLabel,
  getTypeLabel,
  formatDistance,
  formatDuration,
} from '../construction-utils';

describe('Construction Utils', () => {
  describe('STATUS_COLORS', () => {
    it('should contain all expected status colors', () => {
      expect(STATUS_COLORS['planned']).toBe('bg-gray-400');
      expect(STATUS_COLORS['in-progress']).toBe('bg-amber-500');
      expect(STATUS_COLORS['completed']).toBe('bg-green-500');
      expect(STATUS_COLORS['paused']).toBe('bg-red-500');
      expect(STATUS_COLORS['cancelled']).toBe('bg-gray-600');
    });
  });

  describe('STATUS_LABELS', () => {
    it('should contain all expected Vietnamese status labels', () => {
      expect(STATUS_LABELS['planned']).toBe('Kế hoạch');
      expect(STATUS_LABELS['in-progress']).toBe('Đang thi công');
      expect(STATUS_LABELS['completed']).toBe('Hoàn thành');
      expect(STATUS_LABELS['paused']).toBe('Tạm dừng');
      expect(STATUS_LABELS['cancelled']).toBe('Đã hủy');
    });
  });

  describe('TYPE_LABELS', () => {
    it('should contain all expected Vietnamese type labels', () => {
      expect(TYPE_LABELS['road']).toBe('Công trình đường');
      expect(TYPE_LABELS['highway']).toBe('Cao tốc');
      expect(TYPE_LABELS['metro']).toBe('Metro');
      expect(TYPE_LABELS['bridge']).toBe('Cầu');
      expect(TYPE_LABELS['tunnel']).toBe('Hầm');
      expect(TYPE_LABELS['interchange']).toBe('Nút giao');
      expect(TYPE_LABELS['station']).toBe('Trạm');
      expect(TYPE_LABELS['other']).toBe('Khác');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for planned status', () => {
      expect(getStatusColor('planned')).toBe('bg-gray-400');
    });

    it('should return correct color for in-progress status', () => {
      expect(getStatusColor('in-progress')).toBe('bg-amber-500');
    });

    it('should return correct color for completed status', () => {
      expect(getStatusColor('completed')).toBe('bg-green-500');
    });

    it('should return correct color for paused status', () => {
      expect(getStatusColor('paused')).toBe('bg-red-500');
    });

    it('should return correct color for cancelled status', () => {
      expect(getStatusColor('cancelled')).toBe('bg-gray-600');
    });

    it('should return default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('bg-gray-400');
      expect(getStatusColor('')).toBe('bg-gray-400');
      expect(getStatusColor('active')).toBe('bg-gray-400');
    });
  });

  describe('getStatusLabel', () => {
    it('should return Vietnamese label for planned status', () => {
      expect(getStatusLabel('planned')).toBe('Kế hoạch');
    });

    it('should return Vietnamese label for in-progress status', () => {
      expect(getStatusLabel('in-progress')).toBe('Đang thi công');
    });

    it('should return Vietnamese label for completed status', () => {
      expect(getStatusLabel('completed')).toBe('Hoàn thành');
    });

    it('should return Vietnamese label for paused status', () => {
      expect(getStatusLabel('paused')).toBe('Tạm dừng');
    });

    it('should return Vietnamese label for cancelled status', () => {
      expect(getStatusLabel('cancelled')).toBe('Đã hủy');
    });

    it('should return the input status for unknown status', () => {
      expect(getStatusLabel('unknown')).toBe('unknown');
      expect(getStatusLabel('custom-status')).toBe('custom-status');
    });
  });

  describe('getTypeLabel', () => {
    it('should return Vietnamese label for road type', () => {
      expect(getTypeLabel('road')).toBe('Công trình đường');
    });

    it('should return Vietnamese label for highway type', () => {
      expect(getTypeLabel('highway')).toBe('Cao tốc');
    });

    it('should return Vietnamese label for metro type', () => {
      expect(getTypeLabel('metro')).toBe('Metro');
    });

    it('should return Vietnamese label for bridge type', () => {
      expect(getTypeLabel('bridge')).toBe('Cầu');
    });

    it('should return Vietnamese label for tunnel type', () => {
      expect(getTypeLabel('tunnel')).toBe('Hầm');
    });

    it('should return Vietnamese label for interchange type', () => {
      expect(getTypeLabel('interchange')).toBe('Nút giao');
    });

    it('should return Vietnamese label for station type', () => {
      expect(getTypeLabel('station')).toBe('Trạm');
    });

    it('should return Vietnamese label for other type', () => {
      expect(getTypeLabel('other')).toBe('Khác');
    });

    it('should return the input type for unknown type', () => {
      expect(getTypeLabel('unknown')).toBe('unknown');
      expect(getTypeLabel('custom-type')).toBe('custom-type');
    });
  });

  describe('formatDistance', () => {
    it('should format meters correctly', () => {
      expect(formatDistance(100)).toBe('100 m');
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    it('should round meters to whole numbers', () => {
      expect(formatDistance(100.7)).toBe('101 m');
      expect(formatDistance(100.2)).toBe('100 m');
    });

    it('should format kilometers correctly', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
      expect(formatDistance(1500)).toBe('1.5 km');
      expect(formatDistance(2500)).toBe('2.5 km');
    });

    it('should format large distances correctly', () => {
      expect(formatDistance(10000)).toBe('10.0 km');
      expect(formatDistance(25750)).toBe('25.8 km');
      expect(formatDistance(100000)).toBe('100.0 km');
    });

    it('should handle edge case at 1000 meters', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
    });

    it('should handle zero meters', () => {
      expect(formatDistance(0)).toBe('0 m');
    });

    it('should handle small values', () => {
      expect(formatDistance(1)).toBe('1 m');
      expect(formatDistance(0.5)).toBe('1 m');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only correctly', () => {
      expect(formatDuration(60)).toBe('1 phút');
      expect(formatDuration(300)).toBe('5 phút');
      expect(formatDuration(1800)).toBe('30 phút');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatDuration(3600)).toBe('1 giờ 0 phút');
      expect(formatDuration(3660)).toBe('1 giờ 1 phút');
      expect(formatDuration(5400)).toBe('1 giờ 30 phút');
    });

    it('should format multiple hours correctly', () => {
      expect(formatDuration(7200)).toBe('2 giờ 0 phút');
      expect(formatDuration(9000)).toBe('2 giờ 30 phút');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('0 phút');
      expect(formatDuration(30)).toBe('0 phút');
      expect(formatDuration(59)).toBe('0 phút');
    });

    it('should handle large durations', () => {
      expect(formatDuration(36000)).toBe('10 giờ 0 phút');
      expect(formatDuration(86400)).toBe('24 giờ 0 phút');
    });

    it('should calculate minutes correctly within an hour', () => {
      expect(formatDuration(3720)).toBe('1 giờ 2 phút');
      expect(formatDuration(7260)).toBe('2 giờ 1 phút');
    });
  });
});
