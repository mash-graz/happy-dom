import { Script } from 'vm';
import DetachedBrowser from '../../../src/browser/detached-browser/DetachedBrowser';
import Event from '../../../src/event/Event';
import Window from '../../../src/window/Window';
import BrowserWindow from '../../../src/window/BrowserWindow';
import IRequest from '../../../src/fetch/types/IRequest';
import IResponse from '../../../src/fetch/types/IResponse';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Fetch from '../../../src/fetch/Fetch';
import DOMException from '../../../src/exception/DOMException';
import DOMExceptionNameEnum from '../../../src/exception/DOMExceptionNameEnum';
import BrowserNavigationCrossOriginPolicyEnum from '../../../src/browser/enums/BrowserNavigationCrossOriginPolicyEnum';
import BrowserFrameFactory from '../../../src/browser/utilities/BrowserFrameFactory';
import BrowserErrorCaptureEnum from '../../../src/browser/enums/BrowserErrorCaptureEnum';
import Headers from '../../../src/fetch/Headers';

describe('DetachedBrowserFrame', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('get childFrames()', () => {
		it('Returns child frames.', () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			expect(page.mainFrame.childFrames).toEqual([]);
			const frame1 = BrowserFrameFactory.newChildFrame(page.mainFrame);
			const frame2 = BrowserFrameFactory.newChildFrame(page.mainFrame);
			expect(page.mainFrame.childFrames).toEqual([frame1, frame2]);
		});
	});

	describe('get parentFrame()', () => {
		it('Returns the parent frame.', () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			expect(page.mainFrame.parentFrame).toBe(null);
			const frame1 = BrowserFrameFactory.newChildFrame(page.mainFrame);
			const frame2 = BrowserFrameFactory.newChildFrame(frame1);
			expect(frame2.parentFrame).toBe(frame1);
			expect(frame1.parentFrame).toBe(page.mainFrame);
			expect(page.mainFrame.parentFrame).toBe(null);
		});
	});

	describe('get page()', () => {
		it('Returns the page.', () => {
			const browser = new DetachedBrowser(BrowserWindow);
			const page = browser.defaultContext.pages[0];
			expect(page.mainFrame.page).toBe(page);
		});
	});

	describe('get window()', () => {
		it('Returns the window.', () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.newPage();
			expect(page.mainFrame.window).toBeInstanceOf(BrowserWindow);
			expect(page.mainFrame.window.console).toBe(page.console);
		});
	});

	describe('get content()', () => {
		it('Returns the document HTML content.', () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			page.mainFrame.window.document.write('<div>test</div>');
			expect(page.content).toBe('<html><head></head><body><div>test</div></body></html>');
		});
	});

	describe('set content()', () => {
		it('Sets the document HTML content.', () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			page.mainFrame.content = '<div>test</div>';
			expect(page.mainFrame.window.document.documentElement.outerHTML).toBe(
				'<html><head></head><body><div>test</div></body></html>'
			);
		});

		it('Removes listeners and child nodes before setting the document HTML content.', () => {
			const browser = new DetachedBrowser(BrowserWindow, {
				settings: { errorCapture: BrowserErrorCaptureEnum.disabled }
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			page.mainFrame.content = '<div>test</div>';
			page.mainFrame.window.document.addEventListener('load', () => {
				throw new Error('Should not be called');
			});
			page.mainFrame.window.document.addEventListener('error', () => {
				throw new Error('Should not be called');
			});
			page.mainFrame.content = '<div>test</div>';
			page.mainFrame.window.document.dispatchEvent(new Event('load'));
			page.mainFrame.window.document.dispatchEvent(new Event('error'));
			expect(page.mainFrame.window.document.documentElement.outerHTML).toBe(
				'<html><head></head><body><div>test</div></body></html>'
			);
		});
	});

	describe('get url()', () => {
		it('Returns the document URL.', () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			page.mainFrame.url = 'http://localhost:3000';
			expect(page.mainFrame.url).toBe('http://localhost:3000/');
		});
	});

	describe('set url()', () => {
		it('Sets the document URL.', () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const location = page.mainFrame.window.location;
			page.mainFrame.url = 'http://localhost:3000';
			expect(page.mainFrame.window.location.href).toBe('http://localhost:3000/');
			expect(page.mainFrame.window.location).not.toBe(location);
		});
	});

	describe('waitUntilComplete()', () => {
		it('Waits for all pages to complete.', async () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const frame1 = BrowserFrameFactory.newChildFrame(page.mainFrame);
			const frame2 = BrowserFrameFactory.newChildFrame(page.mainFrame);
			page.mainFrame.evaluate('setTimeout(() => { globalThis.test = 1; }, 10);');
			frame1.evaluate('setTimeout(() => { globalThis.test = 2; }, 10);');
			frame2.evaluate('setTimeout(() => { globalThis.test = 3; }, 10);');
			await page.waitUntilComplete();
			expect(page.mainFrame.window['test']).toBe(1);
			expect(frame1.window['test']).toBe(2);
			expect(frame2.window['test']).toBe(3);
		});
	});

	describe('abort()', () => {
		it('Aborts all ongoing operations.', async () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.newPage();
			const frame1 = BrowserFrameFactory.newChildFrame(page.mainFrame);
			const frame2 = BrowserFrameFactory.newChildFrame(page.mainFrame);
			page.mainFrame.evaluate('setTimeout(() => { globalThis.test = 1; }, 10);');
			frame1.evaluate('setTimeout(() => { globalThis.test = 1; }, 10);');
			frame2.evaluate('setTimeout(() => { globalThis.test = 2; }, 10);');
			page.abort();
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(page.mainFrame.window['test']).toBeUndefined();
			expect(frame1.window['test']).toBeUndefined();
			expect(frame2.window['test']).toBeUndefined();
		});
	});

	describe('evaluate()', () => {
		it("Evaluates a code string in the frame's context.", () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			expect(page.mainFrame.evaluate('globalThis.test = 1')).toBe(1);
			expect(page.mainFrame.window['test']).toBe(1);
		});

		it("Evaluates a VM script in the frame's context.", () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			expect(page.mainFrame.evaluate(new Script('globalThis.test = 1'))).toBe(1);
			expect(page.mainFrame.window['test']).toBe(1);
		});
	});

	describe('goto()', () => {
		it('Navigates to a URL.', async () => {
			let request: IRequest | null = null;
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				request = this.request;
				return Promise.resolve(<IResponse>{
					url: request?.url,
					text: () =>
						new Promise((resolve) => setTimeout(() => resolve('<html><body>Test</body></html>'), 1))
				});
			});

			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.newPage();
			const oldWindow = page.mainFrame.window;
			const response = await page.mainFrame.goto('http://localhost:3000', {
				referrer: 'http://localhost:3000/referrer',
				referrerPolicy: 'no-referrer-when-downgrade'
			});

			expect((<IResponse>response).url).toBe('http://localhost:3000/');
			expect((<IRequest>(<unknown>request)).referrer).toBe('http://localhost:3000/referrer');
			expect((<IRequest>(<unknown>request)).referrerPolicy).toBe('no-referrer-when-downgrade');
			expect(page.mainFrame.url).toBe('http://localhost:3000/');
			expect(page.mainFrame.window).not.toBe(oldWindow);
			expect(oldWindow.location.href).toBe('about:blank');
			expect(page.mainFrame.window.location.href).toBe('http://localhost:3000/');
			expect(page.mainFrame.window.document.body.innerHTML).toBe('Test');
		});

		it('Navigates to a URL with "javascript:" as protocol.', async () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const oldWindow = page.mainFrame.window;
			const response = await page.mainFrame.goto('javascript:document.write("test");');

			expect(response).toBeNull();
			expect(page.mainFrame.url).toBe('about:blank');
			expect(page.mainFrame.window).toBe(oldWindow);

			expect(page.mainFrame.window.document.body.innerHTML).toBe('test');
		});

		it('Navigates to a URL with "about:" as protocol.', async () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.newPage();
			const oldWindow = page.mainFrame.window;
			const response = await page.mainFrame.goto('about:blank');

			expect(response).toBeNull();
			expect(page.mainFrame.url).toBe('about:blank');
			expect(page.mainFrame.window).not.toBe(oldWindow);
		});

		it('Aborts request if it times out.', async () => {
			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.newPage();
			const oldWindow = page.mainFrame.window;
			let error: Error | null = null;
			try {
				await page.mainFrame.goto('http://localhost:9999', {
					timeout: 1
				});
			} catch (e) {
				error = e;
			}

			expect(error).toEqual(
				new DOMException(
					'The operation was aborted. Request timed out.',
					DOMExceptionNameEnum.abortError
				)
			);

			expect(page.mainFrame.url).toBe('http://localhost:9999/');
			expect(page.mainFrame.window).not.toBe(oldWindow);
			expect(page.mainFrame.window.document.body.innerHTML).toBe('');
		});

		it('Handles error status code in response.', async () => {
			let request: IRequest | null = null;
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				request = this.request;
				return Promise.resolve(<IResponse>{
					url: request?.url,
					status: 404,
					statusText: 'Not Found',
					text: () =>
						new Promise((resolve) =>
							setTimeout(() => resolve('<html><body>404 error</body></html>'), 1)
						)
				});
			});

			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.newPage();
			const oldWindow = page.mainFrame.window;
			const response = await page.mainFrame.goto('http://localhost:3000');

			expect(page.mainFrame.url).toBe('http://localhost:3000/');
			expect(page.mainFrame.window).not.toBe(oldWindow);
			expect(page.mainFrame.window.location.href).toBe('http://localhost:3000/');
			expect(page.mainFrame.window.document.body.innerHTML).toBe('404 error');

			expect((<IResponse>(<unknown>response)).status).toBe(404);
			expect(page.virtualConsolePrinter.readAsString()).toBe(
				'GET http://localhost:3000/ 404 (Not Found)\n'
			);
		});

		it('Handles reject when performing fetch.', async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Error'));
			});

			const browser = new DetachedBrowser(BrowserWindow);
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.newPage();
			const oldWindow = page.mainFrame.window;
			let error: Error | null = null;
			try {
				await page.mainFrame.goto('http://localhost:9999');
			} catch (e) {
				error = e;
			}

			expect(error).toEqual(new Error('Error'));

			expect(page.mainFrame.url).toBe('http://localhost:9999/');
			expect(page.mainFrame.window).not.toBe(oldWindow);
			expect(page.mainFrame.window.document.body.innerHTML).toBe('');
		});

		it(`Doesn't navigate a child frame with a different origin from its parent if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.sameOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Should not be called.'));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.sameOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childFrame = BrowserFrameFactory.newChildFrame(page.mainFrame);
			const oldWindow = childFrame.window;

			page.mainFrame.url = 'https://github.com';

			const response = await childFrame.goto('http://localhost:9999');

			expect(response).toBeNull();
			expect(childFrame.url).toBe('about:blank');
			expect(childFrame.window === oldWindow).toBe(true);
		});

		it(`Navigates a child frame with the same origin as its parent if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.sameOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.resolve(<IResponse>(<unknown>{
					text: () => Promise.resolve('Test'),
					headers: new Headers()
				}));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.sameOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childFrame = BrowserFrameFactory.newChildFrame(page.mainFrame);
			const oldWindow = childFrame.window;

			page.mainFrame.url = 'https://github.com';

			await childFrame.goto('https://github.com/capricorn86/happy-dom');

			expect(childFrame.url).toBe('https://github.com/capricorn86/happy-dom');
			expect(childFrame.window === oldWindow).toBe(false);
		});

		it(`Doesn't navigate a popup with a different origin from its parent if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.sameOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Should not be called.'));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.sameOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childPage = browser.newPage(page.mainFrame);
			const oldWindow = childPage.mainFrame.window;

			page.mainFrame.url = 'https://github.com';

			const response = await childPage.mainFrame.goto('http://localhost:9999');

			expect(response).toBeNull();
			expect(childPage.mainFrame.url).toBe('about:blank');
			expect(childPage.mainFrame.window === oldWindow).toBe(true);
		});

		it(`Navigates a popup with the same origin as its parent if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.sameOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.resolve(<IResponse>(<unknown>{
					text: () => Promise.resolve('Test'),
					headers: new Headers()
				}));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.sameOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childPage = browser.newPage(page.mainFrame);
			const oldWindow = childPage.mainFrame.window;

			page.mainFrame.url = 'https://github.com';

			await childPage.mainFrame.goto('https://github.com/capricorn86/happy-dom');

			expect(childPage.mainFrame.url).toBe('https://github.com/capricorn86/happy-dom');
			expect(childPage.mainFrame.window === oldWindow).toBe(false);
		});

		it(`Doesn't navigate from one origin to another if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.sameOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Should not be called.'));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.sameOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.newPage();
			const oldWindow = page.mainFrame.window;

			page.mainFrame.url = 'https://github.com';

			const response = await page.mainFrame.goto('http://localhost:9999');

			expect(response).toBeNull();
			expect(page.mainFrame.url).toBe('https://github.com/');
			expect(page.mainFrame.window === oldWindow).toBe(true);
		});

		it(`Navigates from "http" to "https" if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.strictOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.resolve(<IResponse>(<unknown>{
					text: () => Promise.resolve('Test'),
					headers: new Headers()
				}));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.strictOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childPage = browser.newPage(page.mainFrame);
			const oldWindow = childPage.mainFrame.window;

			page.mainFrame.url = 'http://github.com';

			await childPage.mainFrame.goto('https://github.com/capricorn86/happy-dom');

			expect(childPage.mainFrame.url).toBe('https://github.com/capricorn86/happy-dom');
			expect(childPage.mainFrame.window === oldWindow).toBe(false);
		});

		it(`Navigates from "https" to "https" if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.strictOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.resolve(<IResponse>(<unknown>{
					text: () => Promise.resolve('Test'),
					headers: new Headers()
				}));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.strictOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childPage = browser.newPage(page.mainFrame);
			const oldWindow = childPage.mainFrame.window;

			page.mainFrame.url = 'https://github.com';

			await childPage.mainFrame.goto('https://github.com/capricorn86/happy-dom');

			expect(childPage.mainFrame.url).toBe('https://github.com/capricorn86/happy-dom');
			expect(childPage.mainFrame.window === oldWindow).toBe(false);
		});

		it(`Navigates from "about" to "http" if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.strictOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.resolve(<IResponse>(<unknown>{
					text: () => Promise.resolve('Test'),
					headers: new Headers()
				}));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.strictOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childPage = browser.newPage(page.mainFrame);
			const oldWindow = childPage.mainFrame.window;

			await childPage.mainFrame.goto('http://github.com/capricorn86/happy-dom');

			expect(childPage.mainFrame.url).toBe('http://github.com/capricorn86/happy-dom');
			expect(childPage.mainFrame.window === oldWindow).toBe(false);
		});

		it(`Navigates from "https" to "about" if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.strictOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.resolve(<IResponse>(<unknown>{
					text: () => Promise.resolve('Test'),
					headers: new Headers()
				}));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.strictOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childPage = browser.newPage(page.mainFrame);
			const oldWindow = childPage.mainFrame.window;

			page.mainFrame.url = 'https://github.com';

			await childPage.mainFrame.goto('about:blank');

			expect(childPage.mainFrame.url).toBe('about:blank');
			expect(childPage.mainFrame.window === oldWindow).toBe(false);
		});

		it(`Doesn't navigate from "https" to "http" if the setting "navigation.crossOriginPolicy" is set to "${BrowserNavigationCrossOriginPolicyEnum.strictOrigin}".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Should not be called.'));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						crossOriginPolicy: BrowserNavigationCrossOriginPolicyEnum.strictOrigin
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.newPage();
			const oldWindow = page.mainFrame.window;

			page.mainFrame.url = 'https://github.com';

			const response = await page.mainFrame.goto('http://github.com/capricorn86/happy-dom');

			expect(response).toBeNull();
			expect(page.mainFrame.url).toBe('https://github.com/');
			expect(page.mainFrame.window === oldWindow).toBe(true);
		});

		it(`Navigates child frames if the setting "navigation.disableChildFrameNavigation" is set to "false".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.resolve(<IResponse>(<unknown>{
					text: () => Promise.resolve('Test'),
					headers: new Headers()
				}));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						disableChildFrameNavigation: false,
						disableFallbackToSetURL: true
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childFrame = BrowserFrameFactory.newChildFrame(page.mainFrame);
			const oldWindow = childFrame.window;

			await childFrame.goto('http://localhost:9999');

			expect(childFrame.url).toBe('http://localhost:9999/');
			expect(childFrame.window === oldWindow).toBe(false);
		});

		it(`Doesn't navigate child frames if the setting "navigation.disableChildFrameNavigation" is set to "true".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Should not be called.'));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						disableChildFrameNavigation: true,
						disableFallbackToSetURL: true
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childFrame = BrowserFrameFactory.newChildFrame(page.mainFrame);
			const oldWindow = childFrame.window;

			const response = await childFrame.goto('http://localhost:9999');

			expect(response).toBeNull();
			expect(childFrame.url).toBe('about:blank');
			expect(childFrame.window === oldWindow).toBe(true);
		});

		it(`Navigates child pages if the setting "navigation.disableChildPageNavigation" is set to "false".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.resolve(<IResponse>(<unknown>{
					text: () => Promise.resolve('Test'),
					headers: new Headers()
				}));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						disableChildPageNavigation: false,
						disableFallbackToSetURL: true
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childPage = browser.newPage(page.mainFrame);
			const oldWindow = childPage.mainFrame.window;

			await childPage.mainFrame.goto('http://localhost:9999');

			expect(childPage.mainFrame.url).toBe('http://localhost:9999/');
			expect(childPage.mainFrame.window === oldWindow).toBe(false);
		});

		it(`Doesn't navigate child pages if the setting "navigation.disableChildPageNavigation" is set to "true".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Should not be called.'));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						disableChildPageNavigation: true,
						disableFallbackToSetURL: true
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const childPage = browser.newPage(page.mainFrame);
			const oldWindow = childPage.mainFrame.window;

			const response = await childPage.mainFrame.goto('http://localhost:9999');

			expect(response).toBeNull();
			expect(childPage.mainFrame.url).toBe('about:blank');
			expect(childPage.mainFrame.window === oldWindow).toBe(true);
		});

		it(`Doesn't navigate the main frame if the setting "navigation.disableMainFrameNavigation" is set to "true".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Should not be called.'));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						disableMainFrameNavigation: true,
						disableFallbackToSetURL: true
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.newPage();
			const oldWindow = page.mainFrame.window;

			await page.mainFrame.goto('http://localhost:9999');

			expect(page.mainFrame.url).toBe('about:blank');
			expect(page.mainFrame.window === oldWindow).toBe(true);
		});

		it(`Navigates the main frame if the setting "navigation.disableMainFrameNavigation" is set to "false".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.resolve(<IResponse>{
					text: () => Promise.resolve('Test')
				});
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						disableMainFrameNavigation: false,
						disableFallbackToSetURL: true
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.newPage();
			const oldWindow = page.mainFrame.window;

			await page.mainFrame.goto('http://localhost:9999');

			expect(page.mainFrame.url).toBe('http://localhost:9999/');
			expect(page.mainFrame.window === oldWindow).toBe(false);
		});

		it(`Doesn't navigate the main page frame of a detached browser.`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Should not be called.'));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						disableFallbackToSetURL: true
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const oldWindow = page.mainFrame.window;

			await page.mainFrame.goto('http://localhost:9999');

			expect(page.mainFrame.url).toBe('about:blank');
			expect(page.mainFrame.window === oldWindow).toBe(true);
		});

		it(`Sets URL when the main page frame of a detached browser if "disableFallbackToSetURL" is set to "false".`, async () => {
			vi.spyOn(Fetch.prototype, 'send').mockImplementation(function (): Promise<IResponse> {
				return Promise.reject(new Error('Should not be called.'));
			});

			const browser = new DetachedBrowser(BrowserWindow, {
				settings: {
					navigation: {
						disableFallbackToSetURL: false
					}
				}
			});
			browser.defaultContext.pages[0].mainFrame.window = new Window();
			const page = browser.defaultContext.pages[0];
			const oldWindow = page.mainFrame.window;

			await page.mainFrame.goto('http://localhost:9999');

			expect(page.mainFrame.url).toBe('http://localhost:9999/');
			expect(page.mainFrame.window === oldWindow).toBe(true);
		});
	});
});
