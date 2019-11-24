const axios = require('axios');

const puppeteer = require('puppeteer');


let replies = [];

let localDomain = "http://localhost:80";
let realDomain = "https://craw.in-diary.com";

const craw = async (event) => {
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

	await axios.post(localDomain + '/api/replies', {
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


axios.get(localDomain + '/api/events', {
	params: {
		orderBy: "created_at",
		align: "desc",
		state: "waiting"
	}
}).then((response) => {
	let events = response.data.data;

	events.map((event) => {
		if(Date.now() >= Date.parse(event.reservated_at))
			craw(event).catch((error) => {
				console.log(error);
			})
	})
}).catch((error) => {
	console.log(error);
});


/*
div.C4VMK a.FPmhX 의 href랑 text
div.C4VMK span의 text
*/
