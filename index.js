const axios = require('axios');

const puppeteer = require('puppeteer');

let event = null;

let replies = [];

let localDomain = "http://localhost:80";

const craw = async () => {
	const browser = await puppeteer.launch({headless: false, args: ["--window-size=1920,1080", '--disable-notifications']});
	const page = await browser.newPage();
	const getReplies = async () => {
		replies = await page.$$eval('div.C4VMK', replies => replies.map((reply) => {
			const nickname = reply.querySelector('a.FPmhX').textContent;
			const link = reply.querySelector("a.FPmhX").href;
			const body = reply.querySelector('span').textContent;
			const repliedAt = reply.querySelector('time').title;
			
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
			btnMore.click();
			
			btnMore = await page.waitForSelector('ul.XQXOT button.dCJp8').catch((error) => {
				console.log(error);
				
				btnMore = null;
				
				getReplies();
			});
		}
	}
	
	await axios.post(localDomain + '/api/replies', {
		"event_id" : event.id,
		"replies" : replies
	}).then((response) => {
		console.log(response.data);
	});
	
	await page.close();
	
	await browser.close();
};


axios.get(localDomain + '/api/events', {
	params: {
		take: 1,
		orderBy: "created_at",
		align: "desc"
	}
}).then((response) => {
	event = response.data.data[0];

	craw().catch((error) => {
		console.log(error);
	});
}).catch((error) => {
	console.log(error);
});


/*
div.C4VMK a.FPmhX 의 href랑 text
div.C4VMK span의 text
*/
