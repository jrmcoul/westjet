const puppeteer = require('puppeteer');

// User input and creating URL
const dateTime = process.argv[2];
const orig = process.argv[3];
const dest = process.argv[4];
// const dateTime = '2019-05-26T10:30'; 
const date = dateTime.slice(0,10);
const time = dateTime.slice(11,16);
// const orig = 'YYC';
// const dest = 'SFO';
const url = 'https://www.westjet.com/booking/Create.html?lang=en&type=search&origin=' + 
	orig + '&destination=' + dest + '&adults=1&children=0&infants=0&outboundDate=' + 
	date + '&returnDate=&companionvoucher=false&iswestjetdollars=false&promo=&currency=USD';

// Puppeteer code
(async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	// Navigating to URL of all flights from orig to dest on the given date
	await page.goto(url);
	await page.waitForNavigation({ waitUntil: 'networkidle0' });
	console.log('on web page');

	// Clicking the 'View' button for the flight at the given time
	const viewButton = await page.$x("//span[contains(text(), '" + time + "')]/../../../../../../descendant::button[contains(@class, 'btn drawer-toggle')]");
	await viewButton[0].click();
	console.log('step 1');

	// Clicking the cheapest option
	await page.waitForSelector('.fares-container');
	const cheapestButton = await page.$$(".fares-container button");
	
	// Creating flag for whether basic was clicked
	const basicButton = await page.$$('.fares-container-inner .basic');
	let basicFlag = true;
	if (basicButton === undefined || basicButton.length == 0) {
    	basicFlag = false;
    	console.log(basicFlag);
	}

	await cheapestButton[0].click();
	// console.log(cheapestButton[0]);
	console.log('step 2');

	// Only need to go through these pages if flight is 'basic'
	if (basicFlag) {
		// Clicking the confirmation check box if basic is checked
		await page.waitForSelector("#conf-checkbox");
		await page.click("#conf-checkbox");
		console.log('step 3');

		// Clicking the 'continue with basic' button
		await page.waitForSelector("#basic-accept");
		await page.click("#basic-accept");
		console.log('step 4');
	}

	// Clicking the flight summary 'continue' button
	await page.waitForSelector(".shopping-cart-breakdown"); // waiting for price calculation
	await page.click("#summaryContinue");
	console.log('step 5');

	// Sign in screen, skip sign in
	await page.waitForSelector("#btn-skip-sign-in", {visible: true}); // waiting for price calculation
	await page.waitFor(4000) //TEMP!!!! This is just a workaround waitForFunction??
	await page.click("#btn-skip-sign-in");
	console.log('on passenger form');

	// Filling out guest form with fake info and then clicking 'continue'
	await page.waitForSelector("#adult-1-title", {visible: true}); // waiting for price calculation
	await page.select('#adult-1-title', 'MR');
	await page.type('#adult-1-firstName', 'John');
	await page.type('#adult-1-lastName', 'Doe');
	await page.select('#adult-1-day', '1');
	await page.select('#adult-1-month', '1');
	await page.select('#adult-1-year', '1990');
	await page.type('#phone', '9142731111');
	await page.type('#email', 'john.doe@gmail.com');
	await page.click("#continue")

	// Waiting for seating chart to load
	await page.waitForSelector("#seatsLegend")

	// Getting the seat prices and the seat numbers
	const seatPriceArr = await page.$x("//span[contains(@class, 'inPrice regular')]");
	const seatNumArr = await page.evaluate(
      () => Array.from(
        document.querySelectorAll('div[data-seatnum]'),
        div => div.getAttribute('data-seatnum')
      )
    );

	// Getting the seat availability from seats in the air_container
    const seatAvailArr = await page.evaluate(
      () => Array.from(
        document.querySelectorAll('.air_container div .seat'),
        div => div.getAttribute('class')
      )
    );

    // Iterating through the seat numbers, seat prices, and seat availability to print out results
	for (let i = 0; i < seatPriceArr.length; i++) {
	  const seatNum = await seatNumArr[i];
	  let seatPrice = await (await seatPriceArr[i].getProperty('innerText')).jsonValue();

	  if (seatPrice == '$0') continue;

	  seatPrice = (seatAvailArr[i] != 'seat blocked' && seatAvailArr[i] != 'seat blocked occupied') 
	  	? seatPrice : 'unavailable';

	  console.log(seatNum + ": this seat is " + seatPrice);
	}

	// // Debugging screenshot
 	// await page.screenshot({path: 'example.png'});

	await browser.close();
})();