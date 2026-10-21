/** @jest-environment jsdom */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AccessGate from './AccessGate';
import { accessRequest } from './lib/access';

jest.mock('./lib/access', () => ({ accessRequest: jest.fn() }));
jest.mock('./App', () => function Workspace({ onLock }) { return <div data-workspace="true"><button onClick={onLock}>Lock workspace</button></div>; });

let root, container;
beforeEach(() => {
  jest.useFakeTimers();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
async function boot() {
  await act(async () => root.render(<AccessGate />));
  for (let i = 0; i < 6; i++) await act(async () => { jest.advanceTimersByTime(1000); });
}
async function enterCode(code) {
  await act(async () => {
    const field = container.querySelector('input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, code);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

test('shows boot progress and never mounts the OS before the server grants access', async () => {
  accessRequest.mockResolvedValue(false);
  localStorage.setItem('authenticated', 'true');
  await act(async () => root.render(<AccessGate />));
  expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  expect(container.querySelector('[data-workspace]')).toBeNull();
  for (let i = 0; i < 6; i++) await act(async () => { jest.advanceTimersByTime(1000); });
  expect(container.querySelector('input[type="password"]')).not.toBeNull();
  expect(container.querySelector('[data-workspace]')).toBeNull();
});

test('wrong codes clear the field and leave the workspace unmounted', async () => {
  accessRequest.mockResolvedValue(false);
  await boot();
  accessRequest.mockRejectedValueOnce(new Error('Access denied.'));
  await enterCode('2460');
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(container.textContent).toContain('Access denied.');
  expect(container.querySelector('input').value).toBe('');
  expect(container.querySelector('[data-workspace]')).toBeNull();
});

test('server-verified remembered access opens the OS; locking removes it and clears the server cookie', async () => {
  accessRequest.mockResolvedValue(true);
  await boot();
  expect(container.querySelector('[data-workspace]')).not.toBeNull();
  accessRequest.mockResolvedValueOnce(false);
  await act(async () => container.querySelector('button').click());
  expect(accessRequest).toHaveBeenCalledWith('DELETE');
  expect(container.querySelector('[data-workspace]')).toBeNull();
  expect(container.querySelector('input[type="password"]')).not.toBeNull();
});

test('network failures fail closed and present a retry action', async () => {
  accessRequest.mockRejectedValue(new Error('Access service unavailable.'));
  await boot();
  expect(container.querySelector('[data-workspace]')).toBeNull();
  expect(container.textContent).toContain('RETRY CONNECTION');
});
