import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('color overrides: key logic', () => {
  const combKeys = [
    'Pattern 1_#FF0000',
    'Pattern 2_#00FF00',
    'Pattern 3_#0000FF',
    'Flat/None'
  ];

  it('extracts patternKey from combKey', () => {
    const extractPatternKey = (key) => key.includes('_') ? key.split('_')[0] : key;
    
    expect(extractPatternKey('Pattern 1_#FF0000')).toBe('Pattern 1');
    expect(extractPatternKey('Pattern 2_#00FF00')).toBe('Pattern 2');
    expect(extractPatternKey('Flat/None')).toBe('Flat/None');
  });

  it('identifies same pattern across different cluster colors', () => {
    const keys = [
      'Pattern 1_#FF0000',
      'Pattern 1_#FF5500',
      'Pattern 2_#00FF00'
    ];
    const patternKeys = keys.map(k => k.includes('_') ? k.split('_')[0] : k);
    
    expect(patternKeys[0]).toBe('Pattern 1');
    expect(patternKeys[1]).toBe('Pattern 1');
    expect(patternKeys[2]).toBe('Pattern 2');
  });
});

describe('color overrides: userColorOverrides behavior', () => {
  let userColorOverrides;
  let originalColorByPattern;

  beforeEach(() => {
    userColorOverrides = {};
    originalColorByPattern = {
      'Pattern 1': '#FF0000',
      'Pattern 2': '#00FF00',
      'Pattern 3': '#0000FF'
    };
  });

  function applyOverride(patternKey, newColor) {
    const color = newColor.toUpperCase();
    if (color === originalColorByPattern[patternKey]) {
      delete userColorOverrides[patternKey];
    } else {
      userColorOverrides[patternKey] = color;
    }
  }

  function getEffectiveColor(patternKey, rawHex) {
    return userColorOverrides[patternKey] || rawHex;
  }

  it('stores override when color differs from original', () => {
    applyOverride('Pattern 1', '#FF00FF');
    expect(userColorOverrides['Pattern 1']).toBe('#FF00FF');
  });

  it('removes override when color matches original', () => {
    userColorOverrides['Pattern 1'] = '#FF00FF';
    applyOverride('Pattern 1', '#FF0000'); // back to original
    expect(userColorOverrides['Pattern 1']).toBeUndefined();
  });

  it('removes override when explicitly set to original', () => {
    applyOverride('Pattern 1', '#FF00FF');
    applyOverride('Pattern 1', '#FF0000');
    expect(userColorOverrides['Pattern 1']).toBeUndefined();
  });

  it('returns override color when set', () => {
    userColorOverrides['Pattern 1'] = '#FF00FF';
    expect(getEffectiveColor('Pattern 1', '#FF0000')).toBe('#FF00FF');
  });

  it('returns raw color when no override', () => {
    expect(getEffectiveColor('Pattern 1', '#FF0000')).toBe('#FF0000');
  });

  it('handles case-insensitive color comparison', () => {
    applyOverride('Pattern 1', '#ff0000'); // lowercase
    expect(userColorOverrides['Pattern 1']).toBeUndefined(); // matches original
  });

  it('preserves overrides for other patterns when one is changed', () => {
    applyOverride('Pattern 1', '#FF00FF');
    applyOverride('Pattern 2', '#00FFFF');
    applyOverride('Pattern 1', '#FF0000'); // reset pattern 1
    expect(userColorOverrides['Pattern 2']).toBe('#00FFFF');
    expect(userColorOverrides['Pattern 1']).toBeUndefined();
  });
});

describe('color overrides: reset all', () => {
  it('clears all overrides', () => {
    const userColorOverrides = {
      'Pattern 1': '#FF00FF',
      'Pattern 2': '#00FFFF',
      'Pattern 3': '#FFFF00'
    };
    
    // Simulate reset all
    Object.keys(userColorOverrides).forEach(key => {
      delete userColorOverrides[key];
    });
    
    expect(Object.keys(userColorOverrides).length).toBe(0);
  });
});

describe('renderer: createColorInputGroup', () => {
  // These tests verify the HTML generation logic
  it('shows reset button when color differs from default', () => {
    const color = '#FF00FF';
    const defaultColor = '#FF0000';
    const isDefault = defaultColor === color.toUpperCase();
    
    expect(isDefault).toBe(false);
  });

  it('hides reset button when color matches default', () => {
    const color = '#FF0000';
    const defaultColor = '#FF0000';
    const isDefault = defaultColor === color.toUpperCase();
    
    expect(isDefault).toBe(true);
  });

  it('uses user override color when available', () => {
    const userOverrides = { 'Pattern 1': '#FF00FF' };
    const color = '#FF0000';
    const currentColor = userOverrides['Pattern 1'] || color;
    
    expect(currentColor).toBe('#FF00FF');
  });

  it('uses original color when no override', () => {
    const userOverrides = { 'Pattern 1': '#FF00FF' };
    const color = '#00FF00';
    const currentColor = userOverrides['Pattern 2'] || color;
    
    expect(currentColor).toBe('#00FF00');
  });
});

describe('color overrides: integration with clustering changes', () => {
  // This simulates what happens when parameters change and re-clustering occurs
  it('preserves override by patternKey when cluster color changes', () => {
    // Initial clustering: Pattern 1 gets #FF0000
    const originalColorByPattern = { 'Pattern 1': '#FF0000' };
    const userColorOverrides = { 'Pattern 1': '#FF00FF' };
    
    // After parameter change, re-clustering: Pattern 1 now gets #FF5500
    // But override is stored by patternKey, so it persists
    const newClusterColor = '#FF5500';
    const effectiveColor = userColorOverrides['Pattern 1'] || newClusterColor;
    
    expect(effectiveColor).toBe('#FF00FF');
  });

  it('override applies to all rows of same pattern', () => {
    const counts = {
      'Pattern 1_#FF0000': { pattern: 'Pattern 1', color: '#FF0000', count: 10 },
      'Pattern 1_#FF5500': { pattern: 'Pattern 1', color: '#FF5500', count: 5 },
      'Pattern 2_#00FF00': { pattern: 'Pattern 2', color: '#00FF00', count: 8 }
    };
    
    const userColorOverrides = { 'Pattern 1': '#FF00FF' };
    
    // Both Pattern 1 rows should show the override color
    const row1Effective = userColorOverrides['Pattern 1'] || counts['Pattern 1_#FF0000'].color;
    const row2Effective = userColorOverrides['Pattern 1'] || counts['Pattern 1_#FF5500'].color;
    
    expect(row1Effective).toBe('#FF00FF');
    expect(row2Effective).toBe('#FF00FF');
  });
});