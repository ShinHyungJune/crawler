'use strict';

module.exports.hello = async event => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Go Serverless v1.0! Your function executed successfully!',
        input: event,
      },
      null,
      2
    ),
  };
};

module.exports.crawling = async eventAWS => {
	const axios = require('axios');

	const puppeteer = require('puppeteer');

	let result = "test";

	let events = null;

	let replies = [];

	let localDomain = "http://localhost:80";
	let realDomain = "https://craw.in-diary.com";

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
			result = response.data;
		}).catch((error) => {
			result = error.response;
		});

		await page.close();

		await browser.close();
	};


	await axios.get(realDomain + '/api/events', {
		params: {
			orderBy: "created_at",
			align: "desc",
		}
	}).then((response) => {
		events = response.data.data;

		events.filter((event) => {
			if()
		});

		result = response.data;

		craw().catch((error) => {
			console.log(error);
		});
	}).catch((error) => {

		result = error.response;

		console.log(error);
	});

	return {
		statusCode: 200,
		body: JSON.stringify(
			{
				message: result,
				input: eventAWS,
			},
			null,
			2
		),
	};

};
