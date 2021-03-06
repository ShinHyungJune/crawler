/* # 타겟이 null로 오면 확인할 것
	1) 해당 컨텐츠가 화면에 노출되기 전에 가져오려 했는지 확인(수집하기전 page.waitFor를 넉넉하게 줘)
	2) 타겟클래스를 명확하지 않게 잡았는지(여러개 겹치게 잡았다던지 ex. 더보기 버튼에도 btn_more, 댓글 덧보기 버튼에도 btn_more가 쓰였을 경우 제대로 못가져옴)
	-> 이럴 경우 클래스를 계단식으로 부모부터 자식까지 하나씩 넣어보는거 추천
	3) 어떤 댓글은 해당 클래스가 있고, 어떤 댓글은 없는 경우가 있음. 이럴 경우 에러나니까 조건문 처리 해줘야됨(예를 들어 댓글의 닉네임을 가져오려고 하는데 어떤 댓글은 비밀 댓글이라 닉네임이 없어)
*/

const axios = require('axios');

const puppeteer = require('puppeteer');

require('dotenv').config();

// let domain = "https://craw-dev.in-diary.com";
let domain = "http://localhost";
// let domain = "https://craw.in-diary.com";

// let headless = process.env.APP_ENV === "local" ? false : true;

let headless = false;

let replies = [];

exports.craw = async (req, res) => {
	
	axios.get(domain + '/api/events', {
		params: {
			"state": "waiting"
		}
	}).then((response) => {
		let events = response.data.data;
		let promises = [];
		
		if (!events)
			return res.send("nothing to do");
		
		events.map(async (event) => {
			if (Date.now() >= Date.parse(event.reservated_at)) {
				
				if (event.link_facebook)
					promises.push(crawFacebook(event));

				if(event.link_naver)
					promises.push(crawNaver(event));

				if(event.link_instagram)
					promises.push(crawInstargram(event));
				
				Promise.all(promises)
					.then(() => {
						if (!failed)
							success(event);
					}).catch(error => {
					fail("01" + error, event);
				})
				
			}
		})
	}).catch((error) => {
		console.log(error);
	});
	
	
	// 인스타그램 크롤링
	const crawInstargram = async (event) => {
		
		const browser = await puppeteer.launch({
			headless: headless,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});
		
		const page = await browser.newPage();
		
		await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36");
		
		const getReplies = async () => {
			let result = await page.$$eval('div.C4VMK', replies => replies.map((reply) => {
				const img = "";
				const platform = "instagram";
				const nickname = reply.querySelector('a.FPmhX').textContent;
				const link = reply.querySelector("a.FPmhX").href;
				const body = reply.querySelector('span').textContent ? reply.querySelector('span').textContent : "";
				let repliedAt = new Date(reply.querySelector('time').dateTime);
				
				repliedAt = `${repliedAt.getFullYear()}-${(repliedAt.getMonth() + 1)}-${repliedAt.getDate()} ${repliedAt.getHours()}:${repliedAt.getMinutes()}:${repliedAt.getSeconds()}`;
				/*repliedAt = `${repliedAt.getFullYear()}년 ${(repliedAt.getMonth() + 1)}월 ${repliedAt.getDate()}일 ${repliedAt.getHours()}시 ${repliedAt.getMinutes()}분 ${repliedAt.getSeconds()}초`;*/
				
				return {img, platform, nickname, link, body, replied_at: repliedAt};
			}));

			result = result.shift();

			replies = [...replies, ...result];
		};
		
		await page.setViewport({
			width:1000,
			height:1080
		});
		
		await page.goto(event.link_instagram);
		
		await page.waitFor(3000);
		
		let btnMore = await page.$('ul.XQXOT button.dCJp8'); // 더보기 버튼
		
		if (!btnMore) {
			await getReplies().catch(error => fail(error, event));
		} else {
			while (btnMore) {
				await btnMore.click().catch((error) => {
					console.log(error);
				});
				
				btnMore = await page.waitForSelector('ul.XQXOT button.dCJp8').catch(async (error) => {
					await getReplies().catch(error => fail(error, event));
				});
			}
		}
		
		
		await page.close();
		
		await browser.close();
	};
	
	// 페이스북 크롤링
	const crawFacebook = async (event) => {
		
		// const ip = "124.198.46.8:6498";
		
		const tagClass = {
			btnMore: "._6iiz._77br a",
			btnOpenFilter: "._6iin ._21q1",
			btnFilter: ".__MenuItem",
			replies: "._77bp",
			nickname: "a._6qw4",
			body: "._72vr",
			repliedAt: "abbr",
			img: ".img"
		};
		
		const user = {
			email: process.env.FACEBOOK_EMAIL,
			password: process.env.FACEBOOK_PASSWORD,
		};
		
		let browser = await puppeteer.launch({
			headless: headless,
			args: ["--window-size=1920,1080", '--disable-notifications', "--no-sandbox"]
		});
		
		let page = await browser.newPage();
		
		await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36");
		
		/* 프록시 긁어오기
		
		const proxyClass = {
			ip: "tr > td:first-of-type > .spy14",
			type: "tr > td:nth-of-type(2)",
			speed: "tr > td:nth-of-type(6) .spy1"
		};
		
		let page = await browser.newPage();
		
		await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36");

		await page.goto("http://spys.one/free-proxy-list/KR/");
		
		let proxies = await page.evaluate((proxyClass) => {
			const ips = Array.from(document.querySelectorAll(proxyClass.ip)).map(ip => ip.textContent.replace(/document\.write\(.+\)/, ''));
			const types = Array.from(document.querySelectorAll(proxyClass.type)).slice(5).map(type => type.textContent);
			const speeds = Array.from(document.querySelectorAll(proxyClass.speed)).map(speed => parseFloat(speed.textContent));
			
			return ips.map((ip, index) => {
				return {
					ip: ip,
					type: types[index],
					speed: speeds[index]
				}
			});
		}, proxyClass);
		
		proxies = proxies.filter(proxy => proxy.type.startsWith('HTTP')).sort((a,b) => a.speed - b.speed);
		
		await page.close();
		await browser.close();
		
		console.log(proxies[0]);
		console.log(proxies);
		* */
		
		const getReplies = async () => {
			let result = await page.$$eval("._77bp > li", (replies, tagClass) => replies.map((reply) => { // 여러개가 다 잡히면 안되고 딱 그 특정 태그만 잡히도록 설정해야돼 ._77b li로 하면 잣대고 ._77b > li하면 괜찮
				
				const img = reply.querySelector(tagClass.img).src;
				const platform = "facebook";
				const nickname = reply.querySelector(tagClass.nickname).textContent;
				const link = reply.querySelector(tagClass.nickname).href;
				const body = reply.querySelector(tagClass.body).textContent;
				let repliedAt = reply.querySelector(tagClass.repliedAt).getAttribute("data-utime");
				
				repliedAt = new Date(repliedAt * 1000);
				
				repliedAt = `${repliedAt.getFullYear()}-${(repliedAt.getMonth() + 1)}-${repliedAt.getDate()} ${repliedAt.getHours()}:${repliedAt.getMinutes()}:${repliedAt.getSeconds()}`;
				
				return {img, platform, nickname, link, body, replied_at: repliedAt};
			}), tagClass);

			result = result.shift();
			
			replies = [...replies, ...result];
			
		};
		
		
		await page.setViewport({
			width:1000,
			height:1080
		});
		
		
		await page.goto(event.link_facebook); // #실제 event.link
		
		// 로그인
		await page.evaluate((user) => {
			document.getElementsByName('email')[0].value = user.email;
			document.getElementsByName('pass')[0].value = user.password;
			document.querySelector("#loginbutton").click();
		}, user);
		
		await page.waitFor(30000);
		
		let btnOpenFilter = await page.$(tagClass.btnOpenFilter);
		
		await page.waitFor(5000);
		
		await btnOpenFilter.click();
		
		await page.waitFor(5000);
		
		// 댓글 전체보기 버튼 가져오기(맨 마지막 인덱스에 배치되어있더라)
		let btnFilters = await page.$$(tagClass.btnFilter);
		
		btnFilters[btnFilters.length - 1].click();
		
		page.waitFor(3000);
		
		let btnMore = await page.$(tagClass.btnMore);
		
		if (!btnMore) {
			await getReplies().catch(error => fail(error, event));
		} else {
			while (btnMore) {
				await btnMore.click().catch((error) => {
					console.log(error);
				});
				
				btnMore = await page.waitForSelector(tagClass.btnMore).catch(async (error) => {
					await getReplies().catch(error => fail(error, event));
				});
			}
		}
		
		await page.close();
		
		await browser.close();
	};

// 네이버 크롤링
	const crawNaver = async (event) => {
		let result = [];
		
		let tagClass = {
			btnShowReply: ".btn_comment",
			page: "a.u_cbox_page .u_cbox_num_page",
			btnMore: ".btn_pagination .prev",
			btnMoreDisabled: ".btn_pagination .prev.dimmed",
			replies: ".u_cbox_content_wrap > .u_cbox_list > li",
			nickname: ".u_cbox_name",
			body: ".u_cbox_contents",
			repliedAt: ".u_cbox_date",
			img: "img.u_cbox_img_profile"
		};
		
		const browser = await puppeteer.launch({
			headless: headless,
			args: ["--window-size=1920,1080", '--disable-notifications', '--no-sandbox']
		});
		
		const page = await browser.newPage();
		
		await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36");
		
		const getReplies = async () => {
			result = await page.$$eval(tagClass.replies, (replies, tagClass) => replies.map((reply) => { // 여러개가 다 잡히면 안되고 딱 그 특정 태그만 잡히도록 설정해야돼 ._77b li로 하면 잣대고 ._77b > li하면 괜찮
				
				let platform = "naver";
				let img = reply.querySelector(tagClass.img) ? reply.querySelector(tagClass.img).src : "";
				let nickname = reply.querySelector(tagClass.nickname) ? reply.querySelector(tagClass.nickname).textContent : "";
				let link = reply.querySelector(tagClass.nickname) ? reply.querySelector(tagClass.nickname).href : "";
				let body = reply.querySelector(tagClass.body) ? reply.querySelector(tagClass.body).textContent : "";
				let repliedAt = reply.querySelector(tagClass.repliedAt) ? new Date(reply.querySelector(tagClass.repliedAt).getAttribute("data-value")) : null;
				
				if (repliedAt)
					repliedAt = `${repliedAt.getFullYear()}-${(repliedAt.getMonth() + 1)}-${repliedAt.getDate()} ${repliedAt.getHours()}:${repliedAt.getMinutes()}:${repliedAt.getSeconds()}`;
				
				/*if(repliedAt !== "")
					repliedAt = `${repliedAt.getFullYear()}년 ${(repliedAt.getMonth() + 1)}월 ${repliedAt.getDate()}일 ${repliedAt.getHours()}시 ${repliedAt.getMinutes()}분 ${repliedAt.getSeconds()}초`;*/
				
				if (nickname !== "") // 비밀댓글이 아닐 경우만 댓글목록에 추가
					return {img, platform, nickname, link, body, replied_at: repliedAt};
			}), tagClass);
			
			replies = [...replies, ...result];
			
			result = [];
		};
		
		await page.setViewport({
			width:1400,
			height:1000
		});
		
		await page.goto(event.link_naver); // #실제 event.link
		
		await page.waitFor(5000);
		
		let btnShowReply = await page.$(tagClass.btnShowReply);
		
		await btnShowReply.click();
		
		await page.waitFor(3000);
		
		let btnMore = await page.$(tagClass.btnMore);
		
		let btnMoreDisabled = await page.$(tagClass.btnMoreDisabled); // 더 볼 페이지가 없을 경우 보이는 버튼
		
		let rotate = async () => {
			if (btnMoreDisabled) {
				
				replies = replies.filter(reply => reply !== null && reply.body.length !== 0);
				
				await page.close();
				
				await browser.close();
				
				return null;
			}
			
			await getReplies().catch(error => fail("02: " + error, event));
			
			await btnMore.click().catch((error) => {
				console.log("3" + error);
			});
			
			btnMoreDisabled = await page.$(tagClass.btnMoreDisabled);
			
			await rotate().catch(error => fail("03: " + error, event));
		};
		
		if (btnMoreDisabled) {
			await getReplies().catch(error => fail("04: " + error, event));
		} else {
			await rotate().catch(error => fail("05: " + error, event));
		}
		
	};
	
	let failed = false;
	
	let fail = (error, event) => {
		console.log(error);
		
		failed = true;
		
		axios.patch(domain + "/api/events/" + event.id, {
			...event,
			state: "failed"
		});
		
		return res.send(error);
	};
	
	let success = (event) => {
		axios.post(domain + '/api/replies', {
			"event_id": event.id,
			"replies": replies
		}).then((response) => {
			replies = [];
		}).catch((error) => {
			console.log(error.response.data);
			
			replies = [];
		});
	};
};


