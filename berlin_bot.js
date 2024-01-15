const { Builder, By, until, Select } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const puppeteer = require("puppeteer");
const player = require("play-sound")();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class WebDriver {
	constructor() {
		this.driver = null;
		this.implicitWaitTime = 20000; // in milliseconds
	}

	async initialize() {
		console.log("Open browser");
		let options = new chrome.Options();
		options.addArguments("--disable-blink-features=AutomationControlled");

		this.driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
		await this.driver.manage().setTimeouts({ implicit: this.implicitWaitTime });
		await this.driver.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
	}

	async quit() {
		console.log("Close browser");
		if (this.driver) {
			await this.driver.quit();
		}
	}

	async executeCdpCommand(command, params) {
		const page = await this.driver.getWindowHandle();
		const client = await this.driver.getWebDriver().getDriver().getService().createSession(page);
		await client.send(command, params);
		await client.detach();
	}
}

class BerlinBot {
	constructor() {
		this.waitTime = 20000; // in milliseconds
		this.soundFile = "alarm.wav";
		this.errorMessage = "Für die gewählte Dienstleistung sind aktuell keine Termine frei! Bitte";
	}

	async enterStartPage() {
		console.log("Visit start page");
		await this.driver.get("https://otv.verwalt-berlin.de/ams/TerminBuchen");
		await this.driver.findElement(By.xpath('//*[@id="mainForm"]/div/div/div/div/div/div/div/div/div/div[1]/div[1]/div[2]/a')).click();
		await sleep(5000);
	}

	async tickOffSomeBullshit() {
		console.log("Ticking off agreement");
		await this.driver.findElement(By.xpath('//*[@id="xi-div-1"]/div[4]/label[2]/p')).click();
		await sleep(1000);
		await this.driver.findElement(By.id("applicationForm:managedForm:proceed")).click();
	}

	async enterForm() {
		console.log("Fill out form");
		// select Iran
		try {
			// Wait for the option 'Islamic Republic of Iran' to be present in the dropdown
			const selectElement = await this.driver.wait(
				until.elementLocated(By.xpath("//select[@id='xi-sel-400']/option[text()='Iran, Islamische Republik']")),
				10000, // Timeout in milliseconds
				"Timeout waiting for the option 'Iran, Islamische Republik' to be present in the dropdown"
			);

			console.log("Option 'Islamic Republic of Iran' located in the dropdown, proceeding...");
			const selectIran = await this.driver.findElement(By.id("xi-sel-400"));
			await selectIran.sendKeys("Iran, Islamische Republik");
		} catch (error) {
			console.error("Error:", error);
			// Handle or rethrow the error based on your needs.
		}
		await sleep(1000);

		// eine person
		const selectPerson = await this.driver.findElement(By.id("xi-sel-422"));
		await selectPerson.sendKeys("drei Personen");
		// with family
		const selectFamily = await this.driver.findElement(By.id("xi-sel-427"));
		await selectFamily.sendKeys("ja");
		// Nationality of the family member
		const selectFamilyNationality = await this.driver.findElement(By.id("xi-sel-428"));
		await selectFamilyNationality.sendKeys("Iran, Islamische Republik");
		await sleep(3000);

		// extend stay
		const extendStay = await this.driver.findElement(By.xpath('//*[@id="xi-div-30"]/div[2]/label/p'));
		await extendStay.click();
		await sleep(3000);

		try {
			const xpathExpression = "//*[contains(text(), 'Erwerbstätigkeit')]";

			// Wait for the work permit group element to be present
			const workPermitGroupElement = await this.driver.wait(
				until.elementLocated(By.xpath(xpathExpression)),
				20000, // Timeout in milliseconds
				"Timeout waiting for the work permit group element to be present"
			);

			console.log("Work permit group element located, proceeding...");

			await workPermitGroupElement.click();
		} catch (error) {
			console.error("Error:", error);
			// Handle or rethrow the error based on your needs.
		}

		// b/c of work
		const xpathExpression18b = "//*[contains(text(), 'Aufenthaltserlaubnis für Fachkräfte mit akademischer Ausbildung (§ 18b)')]";
		const workReason = await this.driver.findElement(By.xpath(xpathExpression18b));
		await workReason.click();
		await sleep(2000);

		// submit form
		await this.driver.findElement(By.id("applicationForm:managedForm:proceed")).click();
		await sleep(5000);
	}

	async success() {
		console.log("!!!SUCCESS - do not close the window!!!!");
		while (true) {
			this.playSoundOsx(this.soundFile);
			await sleep(15000);
		}
		// todo play something and block the browser
	}

	async runOnce() {
		await this.enterStartPage();
		await this.tickOffSomeBullshit();
		await this.enterForm();

		// retry submit
		for (let i = 0; i < 10; i++) {
			if (!(await this.driver.getPageSource()).includes(this.errorMessage)) {
				await this.success();
			}
			console.log("Retry submitting form");
			await this.driver.findElement(By.id("applicationForm:managedForm:proceed")).click();
			await sleep(this.waitTime);
		}
	}

	async runLoop() {
		// play sound to check if it works
		this.playSoundOsx(this.soundFile);
		while (true) {
			console.log("One more round");
			await this.runOnce();
			await sleep(this.waitTime);
		}
	}

	playSoundOsx(soundFile, block = true) {
		console.log("Play sound");
		player.play(soundFile, (err) => {
			if (err) {
				console.error("Error playing sound:", err);
			}

			if (block) {
				sleep(15000);
			}
		});
	}
}

(async () => {
	const webDriver = new WebDriver();
	await webDriver.initialize();

	const berlinBot = new BerlinBot();
	berlinBot.driver = webDriver.driver;

	try {
		// Play sound to check if it works
		berlinBot.playSoundOsx(berlinBot.soundFile);

		// Run the main loop
		while (true) {
			console.log("One more round");
			await berlinBot.runOnce();
			await sleep(berlinBot.waitTime);
		}
	} catch (error) {
		console.error("An error occurred:", error);
	} finally {
		await webDriver.quit();
	}
})();
