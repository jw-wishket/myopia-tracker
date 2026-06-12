import { describe, it, expect } from 'vitest';
import { renderSidebarItems, sidebarLabelText } from './sidebar.js';

const patients = [
  { id: 'a', name: '김환자', birthDate: '2015-01-01', gender: 'male', customRef: 'R-1' },
  { id: 'b', name: '이환자', birthDate: '2016-02-02', gender: 'female', customRef: null },
];

describe('renderSidebarItems', () => {
  it('환자 버튼을 렌더링하고 선택된 환자를 강조한다', () => {
    const html = renderSidebarItems(patients, 'b');
    expect(html).toContain('김환자');
    expect(html).toContain('이환자');
    expect(html).toContain('data-id="a"');
    expect(html.split('bg-primary-50').length - 1).toBe(1); // 선택 강조는 1명만
  });

  it('빈 목록이면 안내 문구를 반환한다', () => {
    expect(renderSidebarItems([], null)).toContain('환자가 없습니다');
  });
});

describe('sidebarLabelText', () => {
  it('검색 중에는 건수, 평소에는 최근 환자와 전체 수를 표시한다', () => {
    expect(sidebarLabelText({ isSearching: true, count: 3 })).toBe('3건 검색됨');
    expect(sidebarLabelText({ isSearching: false, totalCount: 12 })).toBe('최근 환자 (전체 12명)');
    expect(sidebarLabelText({ isSearching: false, totalCount: 0 })).toBe('최근 환자');
  });
});
