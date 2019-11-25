const axios = require('axios');

const puppeteer = require('puppeteer');

require('dotenv').config();

let replies = [];

let localDomain = "http://localhost:80";
let realDomain = "https://craw.in-diary.com";

// 인스타그램 크롤링
const crawInstargram = async (event) => {
	const browser = await puppeteer.launch({headless: false, args: ["--window-size=1920,1080", '--disable-notifications']});
	const page = await browser.newPage();
	const getReplies = async () => {
		replies = await page.$$eval('div.C4VMK', replies => replies.map((reply) => {
			const nickname = reply.querySelector('a.FPmhX').textContent;
			const link = reply.querySelector("a.FPmhX").href;
			const body = reply.querySelector('span').textContent;
			let repliedAt = new Date(reply.querySelector('time').dateTime);

			repliedAt = `${repliedAt.getFullYear()}년 ${(repliedAt.getMonth() + 1)}월 ${repliedAt.getDate()}일 ${repliedAt.getHours()}시 ${repliedAt.getMinutes()}분 ${repliedAt.getSeconds()}초`;
			return {nickname, link, body, replied_at: repliedAt};
		}));
	};
	
	
	await page.setViewport({
		width:1000,
		height:1080
	});
	
	await page.goto(event.link);
	
	let btnMore = await page.$('ul.XQXOT button.dCJp8'); // 더보기 버튼
	
	if(!btnMore){
		await getReplies();
	}else{
		while(btnMore){
			await btnMore.click().catch((error) => {
				console.log(error);
			});
			
			btnMore = await page.waitForSelector('ul.XQXOT button.dCJp8').catch(async (error) => {
				await getReplies();
			});
		}
	}

	await axios.post(realDomain + '/api/replies', {
		"event_id" : event.id,
		"replies" : replies
	}).then((response) => {
		console.log(response.data);
	}).catch((error) => {
		console.log(error.response.data);
	});
	
	await page.close();
	
	await browser.close();
};

// 페이스북 크롤링
const crawFacebook = async () => {
	const user = {
		email: process.env.FACEBOOK_EMAIL,
		password: process.env.FACEBOOK_PASSWORD,
	};
	
	const facebookUrl = "https://facebook.com";
	
	const testDomain = "https://www.facebook.com/gangwongogo/photos/a.260206274483839/717274852110310/?type=3&theater";
	
	const browser = await puppeteer.launch({headless: false, args: ["--window-size=1920,1080", '--disable-notifications']});
	
	const page = await browser.newPage();
	
	const getReplies = async () => {
		replies = await page.$$eval('div.C4VMK', replies => replies.map((reply) => {
			const nickname = reply.querySelector('a.FPmhX').textContent;
			const link = reply.querySelector("a.FPmhX").href;
			const body = reply.querySelector('span').textContent;
			let repliedAt = new Date(reply.querySelector('time').dateTime);
			
			repliedAt = `${repliedAt.getFullYear()}년 ${(repliedAt.getMonth() + 1)}월 ${repliedAt.getDate()}일 ${repliedAt.getHours()}시 ${repliedAt.getMinutes()}분 ${repliedAt.getSeconds()}초`;
			return {nickname, link, body, replied_at: repliedAt};
		}));
	};
	
	await page.setViewport({
		width:1000,
		height:1080
	});
	
	await page.goto(facebookUrl); // #실제 event.link
	
	// 로그인
	await page.evaluate((user) => {
		document.getElementsByName('email')[0].value = user.email;
		document.getElementsByName('pass')[0].value = user.password;
		document.getElementsByName("login")[0].click();
	}, user);
	
	// 이벤트 페이지로 이동
	await page.goto(testDomain);
	
	/*let btnMore = await page.$('ul.XQXOT button.dCJp8'); // 더보기 버튼
	
	if(!btnMore){
		await getReplies();
	}else{
		while(btnMore){
			await btnMore.click().catch((error) => {
				console.log(error);
			});
			
			btnMore = await page.waitForSelector('ul.XQXOT button.dCJp8').catch(async (error) => {
				await getReplies();
			});
		}
	}
	
	await axios.post(realDomain + '/api/replies', {
		"event_id" : event.id,
		"replies" : replies
	}).then((response) => {
		console.log(response.data);
	}).catch((error) => {
		console.log(error.response.data);
	});
	
	await page.close();
	
	await browser.close();*/
};


axios.get(realDomain + '/api/events', {
	params: {
		orderBy: "created_at",
		align: "desc",
		state: "waiting"
	}
}).then((response) => {
	let events = response.data.data;

	crawFacebook();
	
	/* events.map((event) => {
		if(Date.now() >= Date.parse(event.reservated_at))
			crawInstargram(event).catch((error) => {
				console.log(error);
			})
	}) */
}).catch((error) => {
	console.log(error);
});


/*
div.C4VMK a.FPmhX 의 href랑 text
div.C4VMK span의 text
*/
