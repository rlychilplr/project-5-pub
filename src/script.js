class Game {
  constructor() {
    this.cookieStorage = new CookieStorage();
    this.cookieCounter = new CookieCounter(this.cookieStorage);
    this.upgrades = new ClickUpgrade(this.cookieCounter, this.cookieStorage);
    this.buildings = this.initializeBuildings();
    this.stats = new Stats(this.cookieCounter, this.cookieStorage);
    this.panelManager = new PanelManager(this.stats);
    this.resetModal = new ResetModal(this.cookieCounter, this.stats);
    this.fallingCookieEffect = new FallingCookieEffect(
      document.getElementById("cookie"),
      document.body,
    );
    this.milkWave = new MilkWave("milkCanvas", "images/milkWave.png");
    this.backgroundChanger = new BackgroundChanger();

    this.setupEventListeners();
    this.startGameLoop();
  }

  initializeBuildings() {
    let buildingClasses = [
      CursorBuilding,
      GrandmaBuilding,
      FarmBuilding,
      MineBuilding,
      FactoryBuilding,
      BankBuilding,
      TempleBuilding,
      WizardTowerBuilding,
    ];

    const buildings = buildingClasses.map(
      (BuildingClass) =>
        new BuildingClass(this.cookieCounter, this.cookieStorage),
    );

    // Update all upgrade icons after initialization
    buildings.forEach((building) => building.updateUpgradeIcon());

    return buildings;
  }

  setupEventListeners() {
    const cookieButton = document.getElementById("cookie");
    cookieButton.addEventListener("click", () => this.handleCookieClick());
  }

  handleCookieClick() {
    const clickValue = this.upgrades.bought ? 2 : 1;
    this.cookieCounter.setCookies(this.cookieCounter.cookies + clickValue);
    this.stats.incrementClicks();
    this.stats.incrementCookies(clickValue);
    this.stats.displayStats();
  }

  startGameLoop() {
    setInterval(() => {
      const totalCPS = this.buildings.reduce(
        (sum, building) => sum + building.cookiesPerSecond(),
        0,
      );
      this.cookieCounter.setCookies(this.cookieCounter.cookies + totalCPS);
      this.cookieCounter.updateBuildingCpsDisplay(totalCPS);
      this.stats.incrementCookies(totalCPS);
      this.stats.displayStats();
    }, 1000);
  }
}

class CookieStorage {
  constructor() {
    this.cookieName = "gameData"; // the name of the cookie
  }

  encodeData(data) {
    const jsonString = JSON.stringify(data); // convert to json
    // console.log(Date.now(), jsonString);  // uncomment to see the json before it gets encoded and saved to the cookie
    return btoa(jsonString); // encode json to base64
  }

  decodeData(encodedData) {
    try {
      const jsonString = atob(encodedData); // decode from base64 to json
      return JSON.parse(jsonString); // convert from json to object
    } catch (e) {
      console.error("Failed to decode cookie data", e);
      return null;
    }
  }

  saveData(data) {
    const encodedData = this.encodeData(data);
    Cookies.set(this.cookieName, encodedData, { path: "/", sameSite: "Lax" });
  }

  loadData() {
    const encodedData = Cookies.get(this.cookieName);
    if (!encodedData) {
      return this.getDefaultData();
    }
    return this.decodeData(encodedData) || this.getDefaultData(); // use data from cookie, otherwise from `getDefaultData()`
  }

  getDefaultData() {
    return {
      cookies: 0,
      totalClicks: 0,
      totalCookies: 0,
      startTime: Date.now(),
    };
  }
}

class CookieCounter {
  constructor(cookieStorage) {
    this.cookies = 0; // overwritten by cookie
    this.scoreDisplay = document.getElementById("score");
    this.cookieStorage = cookieStorage;
    this.cpsDisplay = document.getElementById("cps");
    this.loadCookiesFromStorage();
  }

  updateScoreDisplay() {
    this.scoreDisplay.textContent = `${Math.round(this.cookies)} Cookies`; // rounding needed because the cursorBuilding is a float that increases and computers sometimes do weird stuff with float math (0.1 + 0.1 + 0.1 || 0.2 + 0.1 || 0.1 + 0.2)
  }

  updateBuildingCpsDisplay(totalCPS) {
    this.cpsDisplay.innerHTML = "Building Output: ";
    this.cpsDisplay.innerHTML += `${Math.round(totalCPS * 10) / 10}`; // this way you can round to 1 decimal point
  }

  setCookies(amount) {
    this.cookies = amount;
    this.updateScoreDisplay();
    this.saveCookiesToStorage();
  }

  reset() {
    this.setCookies(0);
  }

  loadCookiesFromStorage() {
    const data = this.cookieStorage.loadData();
    this.cookies = data.cookies;
    this.updateScoreDisplay();
  }

  saveCookiesToStorage() {
    const data = this.cookieStorage.loadData();
    data.cookies = this.cookies;
    this.cookieStorage.saveData(data);
  }
}

class FallingCookieEffect {
  constructor(cookieButtonElement, containerElement) {
    this.cookieButtonElement = cookieButtonElement;
    this.containerElement = containerElement;

    this.cookieButtonElement.addEventListener("click", () => {
      this.createFallingCookie();
    });
  }

  createFallingCookie() {
    const fallingCookie = document.createElement("div");
    fallingCookie.classList.add("falling-cookie");

    // Set a random horizontal position
    fallingCookie.style.left = Math.random() * window.innerWidth + "px";

    // Append the cookie to the container
    this.containerElement.appendChild(fallingCookie);

    // Remove cookie after the animation ends
    fallingCookie.addEventListener("animationend", () => {
      fallingCookie.remove();
    });

    // Randomize the fall duration
    const fallDuration = Math.random() * 2 + 2; // Between 2 to 4 seconds
    fallingCookie.style.animationDuration = `${fallDuration}s`;
  }
}

class BuildingUpgrade {
  constructor(building, price, cookieStorage) {
    this.building = building;
    this.price = price;
    this.cookieStorage = cookieStorage;
    this.bought = false; // overwritten by cookie
    this.loadFromStorage();
  }

  buy() {
    if (this.building.cookieCounter.cookies >= this.price && !this.bought) {
      this.building.cookieCounter.setCookies(
        this.building.cookieCounter.cookies - this.price,
      ); // remove relevant amount of cookies and apply upgrade
      this.bought = true;
      this.building.cpsMultiplier *= 2;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  loadFromStorage() {
    const data = this.cookieStorage.loadData();
    this.bought = data[this.getStorageKey()] || false;
    if (this.bought) {
      this.building.cpsMultiplier *= 2;
      this.building.updateProductInfo(); // Add this line
    }
    this.building.updateUpgradeIcon();
  }

  saveToStorage() {
    const data = this.cookieStorage.loadData();
    data[this.getStorageKey()] = this.bought;
    this.cookieStorage.saveData(data);
  }

  getStorageKey() {
    return `${this.building.constructor.name.toLowerCase()}Upgrade`;
  }
}

class ClickUpgrade {
  constructor(cookieCounter, cookieStorage) {
    this.cookieCounter = cookieCounter;
    this.cookieStorage = cookieStorage;
    this.price = 100;
    this.bought = false; // overwritten by cookie
    this.loadFromStorage();
    this.createUpgradeIcon();
  }

  buy() {
    if (this.cookieCounter.cookies >= this.price && !this.bought) {
      this.cookieCounter.setCookies(this.cookieCounter.cookies - this.price);
      this.bought = true;
      this.saveToStorage();
      this.updateUpgradeIcon();
      return true;
    }
    return false;
  }

  loadFromStorage() {
    const data = this.cookieStorage.loadData();
    this.bought = data.clickUpgradeBought || false;
  }

  saveToStorage() {
    const data = this.cookieStorage.loadData();
    data.clickUpgradeBought = this.bought;
    this.cookieStorage.saveData(data);
  }

  createUpgradeIcon() {
    const upgradeContainer = document.querySelector(".grid-container");
    const upgradeIcon = document.createElement("div");
    upgradeIcon.className = "grid-item upgradeBuilding locked";
    upgradeIcon.id = "clickUpgrade";
    upgradeIcon.addEventListener("click", () => this.buy());
    upgradeContainer.appendChild(upgradeIcon);

    const upgradeSideMenu = document.createElement("div");
    upgradeSideMenu.className = "side-menu-item";
    upgradeSideMenu.id = "menu-item-click";
    upgradeSideMenu.innerHTML = `<div class='side-menu-click-icon'></div>`;
    upgradeSideMenu.innerHTML += `<div class='side-menu-click-text'><p>this upgrade will double amount of cookies you gain from clicking <br><img style="width: 16px; height: 16px" src="images/perfectCookie.png" alt="Cookie"/>${this.price}</p></div>`;
    upgradeIcon.appendChild(upgradeSideMenu);

    this.updateUpgradeIcon();
  }

  updateUpgradeIcon() {
    const upgradeIcon = document.getElementById("clickUpgrade");
    if (upgradeIcon) {
      if (this.bought) {
        upgradeIcon.classList.remove("locked");
      }
    }
  }
}

class Building {
  constructor(basePrice, cookieCounter, cookieStorage, productId) {
    this.basePrice = basePrice;
    this.buildingAmount = 0; // overwritten by cookie
    this.buildingPrice = basePrice; // overwritten by calcPrice()
    this.cookieCounter = cookieCounter;
    this.cookieStorage = cookieStorage;
    // this.baseCPS = 0;
    this.productId = productId;
    this.loadFromStorage();
    this.updatePriceDisplay();
    this.updateBuildingAmountDisplay();
    this.setupBuyButton();
    this.cpsMultiplier = 1; // to be overwriten when the upgrade is bought
    this.upgrade = new BuildingUpgrade(this, basePrice * 10, cookieStorage);
    this.createUpgradeIcon();
    this.updateProductInfo();
  }

  calcPrice() {
    this.buildingPrice = Math.round(
      // basePrice * 1.15^n where n = amount of that building owned
      // 1st building cost. 20mil
      // 2nd building cost. `20000000*1.15^1 == 20000000 * (1.15) == 20000000*1.15 = 23mil`
      // 3rd building cost. `20000000*1.15^2 == 20000000 * (1.15*1.15) == 20000000*1.3225 = 26.45mil`
      // 4th building cost. `20000000*1.15^3 == 20000000 * (1.15*1.15*1.15) == 20000000 * 1.5208 = 30416000`

      // graph where x = amount of cursor building and y = price
      // you can change the first number (15) to other values, eg 100 for grandma building, 1100 for farm building etc.
      // https://www.desmos.com/calculator/i7dadg2cto
      this.basePrice * 1.15 ** this.buildingAmount,
    ); // building price rounded to a whole number
    return this.buildingPrice;
  }

  setupBuyButton() {
    const buyButtonLocation = document.getElementById(
      `product${this.productId}`,
    );
    buyButtonLocation.addEventListener("click", (event) => {
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      this.buy(mouseX, mouseY); // Pass mouse position to buy()
    });
  }

  updateProductInfo() {
    const product = document.getElementById(`product${this.productId}`);
    const cpsInfo = product.querySelector(".cps-info");
    const totalCpsInfo = product.querySelector(".total-cps-info");
    const ownedInfo = product.querySelector(".owned-info");

    if (cpsInfo && totalCpsInfo && ownedInfo) {
      const eachCPS = Math.round(this.baseCPS * this.cpsMultiplier * 10) / 10;
      const totalCPS = Math.round(this.cookiesPerSecond() * 10) / 10;
      // get constructor name, remove 'Building' from it, then replace any capital letter to that same letter with a space in front, then remove leading whitespace.
      // 'WizardTowerBuilding' -> 'WizardTower' -> ' Wizard Tower' -> 'Wizard Tower'
      cpsInfo.textContent = `Each ${this.constructor.name
        .replace("Building", "")
        .replace(/([A-Z])/g, " $1")
        .trim()}: ${eachCPS} CPS`;
      totalCpsInfo.textContent = `Total: ${totalCPS} CPS`;
      ownedInfo.textContent = `Owned: ${this.buildingAmount}`;
    }
  }

  buy(mouseX, mouseY) {
    if (this.cookieCounter.cookies < this.buildingPrice) {
      console.log("Not enough cookies");
      this.buyEffectFail(mouseY);
      return;
    }

    this.cookieCounter.setCookies(
      this.cookieCounter.cookies - this.buildingPrice,
    );
    this.buildingAmount++;
    console.log(`You bought a ${this.constructor.name}`);
    this.calcPrice();
    this.updatePriceDisplay();
    this.updateBuildingAmountDisplay();
    this.saveToStorage();
    this.buyEffect(mouseX, mouseY);
    this.updateProductInfo();
  }

  buyEffect(mouseX, mouseY) {
    const buyEffectElement = document.createElement("div");
    buyEffectElement.classList.add("BuyEffect");

    // half of the background-img width
    mouseX -= 24;
    mouseY -= 24;
    // Set the position of the element to the mouse cursor location
    buyEffectElement.style.top = `${mouseY}px`;
    buyEffectElement.style.left = `${mouseX}px`;
    buyEffectElement.style.animationDuration = "1.5s";
    buyEffectElement.draggable = false;
    document.body.appendChild(buyEffectElement);

    //remove effect element once finished
    buyEffectElement.addEventListener("animationend", () => {
      buyEffectElement.remove();
    });
  }

  buyEffectFail(mouseY) {
    const buyEffectElement = document.createElement("div");
    buyEffectElement.classList.add("BuyEffectFail");
    // Set the X position of the element to the X position of the mouse cursor
    mouseY -= 24;
    buyEffectElement.style.top = `${mouseY}px`; // y is set in style
    buyEffectElement.style.animationDuration = "3s";
    buyEffectElement.innerHTML =
      "You don't have enough cookies to buy this item";
    document.body.appendChild(buyEffectElement);

    //remove effect element once finished
    buyEffectElement.addEventListener("animationend", () => {
      buyEffectElement.remove();
    });
  }

  loadFromStorage() {
    const data = this.cookieStorage.loadData();
    this.buildingAmount = data[this.getStorageKey()] || 0;
    this.calcPrice();
  }

  saveToStorage() {
    const data = this.cookieStorage.loadData();
    data[this.getStorageKey()] = this.buildingAmount;
    this.cookieStorage.saveData(data);
  }

  getStorageKey() {
    return `${this.constructor.name.toLowerCase()}Amount`;
  }

  updatePriceDisplay() {
    const priceLocation = document.getElementById(
      `buildingPrice${this.productId}`,
    );
    priceLocation.innerHTML = this.calcPrice();
  }

  updateBuildingAmountDisplay() {
    let location = document.getElementById(`product${this.productId}Amount`);
    location.innerHTML = this.buildingAmount;
  }

  cookiesPerSecond() {
    return this.baseCPS * this.buildingAmount * this.cpsMultiplier;
  }

  createUpgradeIcon() {
    const upgradeContainer = document.querySelector(".grid-container");
    const upgradeIcon = document.createElement("div");
    upgradeIcon.className = "grid-item upgradeBuilding";
    upgradeIcon.id = `${this.constructor.name.toLowerCase()}Upgrade`;
    // upgradeIcon.innerHTML = `${this.constructor.name} Upgrade`;
    upgradeIcon.addEventListener("click", () => this.buyUpgrade());
    upgradeContainer.appendChild(upgradeIcon);

    const upgradeSideMenu = document.createElement("div");
    upgradeSideMenu.className = "side-menu-item";
    upgradeSideMenu.id = `menu-item-${this.productId}`;
    // You might want to customize this HTML for each building type
    upgradeSideMenu.innerHTML = `<div class='side-menu-${this.constructor.name.toLowerCase()}'></div>`;
    upgradeSideMenu.innerHTML += `<div class='side-menu-${this.constructor.name.toLowerCase()}-text'><p>this upgrade will double this building type's output <br><img style="width: 16px; height: 16px" src="images/perfectCookie.png" alt="Cookie"/>${
      this.basePrice * 10
    }</p></div>`;
    upgradeIcon.appendChild(upgradeSideMenu);

    this.updateUpgradeIcon();
  }

  buyUpgrade() {
    if (this.upgrade.buy()) {
      this.updateUpgradeIcon();
      this.updateProductInfo();
    }
  }

  updateUpgradeIcon() {
    const upgradeIcon = document.getElementById(
      `${this.constructor.name.toLowerCase()}Upgrade`,
    );
    if (upgradeIcon) {
      if (this.upgrade.bought) {
        upgradeIcon.classList.remove("locked");
      } else {
        upgradeIcon.classList.add("locked");
      }
    }
  }
}

class CursorBuilding extends Building {
  constructor(cookieCounter, cookieStorage) {
    const basePrice = 15;
    const productId = 0;
    super(basePrice, cookieCounter, cookieStorage, productId); // run the constructor from the `Building` class
    this.baseCPS = 0.1;
    this.updateProductInfo();
  }

  cookiesPerSecond() {
    console.log(this.baseCPS * this.buildingAmount * this.cpsMultiplier);
    return this.baseCPS * this.buildingAmount * this.cpsMultiplier;
  }
}

class GrandmaBuilding extends Building {
  constructor(cookieCounter, cookieStorage) {
    const basePrice = 100;
    const productId = 1;
    super(basePrice, cookieCounter, cookieStorage, productId);
    this.baseCPS = 1;
    this.updateProductInfo();
  }

  cookiesPerSecond() {
    return this.baseCPS * this.buildingAmount * this.cpsMultiplier;
  }
}

class FarmBuilding extends Building {
  constructor(cookieCounter, cookieStorage) {
    const basePrice = 1100;
    const productId = 2;
    super(basePrice, cookieCounter, cookieStorage, productId);
    this.baseCPS = 8;
    this.updateProductInfo();
  }

  cookiesPerSecond() {
    return this.baseCPS * this.buildingAmount * this.cpsMultiplier;
  }
}

class MineBuilding extends Building {
  constructor(cookieCounter, cookieStorage) {
    const basePrice = 12000;
    const productId = 3;
    super(basePrice, cookieCounter, cookieStorage, productId);
    this.baseCPS = 47;
    this.updateProductInfo();
  }

  cookiesPerSecond() {
    return this.baseCPS * this.buildingAmount * this.cpsMultiplier;
  }
}

class FactoryBuilding extends Building {
  constructor(cookieCounter, cookieStorage) {
    const basePrice = 130000;
    const productId = 4;
    super(basePrice, cookieCounter, cookieStorage, productId);
    this.baseCPS = 260;
    this.updateProductInfo();
  }

  cookiesPerSecond() {
    return this.baseCPS * this.buildingAmount * this.cpsMultiplier;
  }
}

class BankBuilding extends Building {
  constructor(cookieCounter, cookieStorage) {
    const basePrice = 1400000;
    const productId = 5;
    super(basePrice, cookieCounter, cookieStorage, productId);
    this.baseCPS = 1400;
    this.updateProductInfo();
  }

  cookiesPerSecond() {
    return this.baseCPS * this.buildingAmount * this.cpsMultiplier;
  }
}

class TempleBuilding extends Building {
  constructor(cookieCounter, cookieStorage) {
    const basePrice = 20000000;
    const productId = 6;
    super(basePrice, cookieCounter, cookieStorage, productId);
    this.baseCPS = 7800;
    this.updateProductInfo();
  }

  cookiesPerSecond() {
    return this.baseCPS * this.buildingAmount * this.cpsMultiplier;
  }
}

class WizardTowerBuilding extends Building {
  constructor(cookieCounter, cookieStorage) {
    const basePrice = 330000000;
    const productId = 7;
    super(basePrice, cookieCounter, cookieStorage, productId);
    this.baseCPS = 44000;
    this.updateProductInfo();
  }

  cookiesPerSecond() {
    return this.baseCPS * this.buildingAmount * this.cpsMultiplier;
  }
}

class Stats {
  constructor(cookieCounter, cookieStorage) {
    this.cookieCounter = cookieCounter;
    this.cookieStorage = cookieStorage;
    this.totalClicks = 0; // replaced by cookie
    this.totalCookies = 0; // replaced by cookie
    this.startTime = Date.now(); // in miliseconds since epoch (jan 1 1970). overwirtten by cookie
    this.statsCurrentCookies = document.getElementById("statsCurrentCookies");
    this.statsTotalCookies = document.getElementById("statsTotalCookies");
    this.statsTotalClicks = document.getElementById("statsTotalClicks");
    this.statsTotalPlaytime = document.getElementById("statsTotalPlaytime");

    this.loadStatsFromStorage();
    this.displayStats();
  }

  incrementClicks() {
    this.totalClicks++;
    this.saveStatsToStorage();
  }

  incrementCookies(amount) {
    this.totalCookies += amount;
    this.saveStatsToStorage();
  }

  getTotalPlaytime() {
    const distance = Math.floor(Date.now() - this.startTime);
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  displayStats() {
    const currentCookies = this.cookieCounter.cookies;

    this.statsCurrentCookies.innerHTML = `Current Cookies: ${currentCookies}`;
    this.statsTotalCookies.innerHTML = `Total Cookies You Baked: ${this.totalCookies}`;
    this.statsTotalClicks.innerHTML = `Total Clicks: ${this.totalClicks}`;
    this.statsTotalPlaytime.innerHTML = `Total Playtime: ${this.getTotalPlaytime()}`;

    const totalBuildings = document.createElement("div");
    totalBuildings.innerHTML = `Buildings Owned: `;

    // Load building amounts from storage
    const data = this.cookieStorage.loadData();

    // Create an array of building names and their storage keys
    const buildings = [
      { name: "Cursors", key: "cursorbuildingAmount" },
      { name: "Grandmas", key: "grandmabuildingAmount" },
      { name: "Farms", key: "farmbuildingAmount" },
      { name: "Mines", key: "minebuildingAmount" },
      { name: "Factories", key: "factorybuildingAmount" },
      { name: "Banks", key: "bankbuildingAmount" },
      { name: "Temples", key: "templebuildingAmount" },
      { name: "Wizard Towers", key: "wizardtowerbuildingAmount" },
    ];

    buildings.forEach((building) => {
      const amount = data[building.key] || 0;
      if (amount > 0) {
        totalBuildings.innerHTML += `<li style="margin-left: 32px;">${building.name}: ${amount}</li>`;
      } else {
        totalBuildings.innerHTML += `<li style="margin-left: 32px;">${building.name}: 0</li>`;
      }
    });

    const note = document.createElement("div");
    note.innerHTML =
      "<h3 style='margin: 9px 0;'>Note that total playtime does count offline time, but when offline you don't gain cookies.</h3>";
    totalBuildings.append(note);

    this.statsTotalPlaytime.append(totalBuildings);
  }

  saveStatsToStorage() {
    const data = this.cookieStorage.loadData();
    data.totalClicks = this.totalClicks;
    data.totalCookies = this.totalCookies;
    this.cookieStorage.saveData(data);
  }

  loadStatsFromStorage() {
    const data = this.cookieStorage.loadData();
    this.totalClicks = data.totalClicks || 0;
    this.totalCookies = data.totalCookies || 0;
    this.startTime = data.startTime || Date.now();
  }
  reset() {
    Cookies.remove("gameData", { path: "/", sameSite: "Lax" }); // completely removes the cookie
    location.reload(true); // reloads the page (without cache like 'ctrl+shift+r') so the CookieStorage.loadData does its thing
  }
}

class PanelManager {
  // this is a lot but very boring, just adding and removing styling from divs
  constructor(stats) {
    this.buildingPanel = document.getElementById("buildingPanel");
    this.statsPanel = document.getElementById("statsPanel");
    this.settingsPanel = document.getElementById("settingsPanel");
    this.optionsButton = document.getElementById("options");
    this.statsButton = document.getElementById("stats");
    this.saveButton = document.getElementById("saveStats");
    this.isOptionsVisible = false;
    this.isStatsVisible = false;
    this.stats = stats;
    this.addEventListeners();
  }
  showBuildingPanel() {
    this.buildingPanel.style.visibility = "visible";
    this.statsPanel.style.visibility = "collapse";
    this.statsButton.style.fontWeight = "normal";
    this.settingsPanel.style.visibility = "collapse";
    this.optionsButton.style.fontWeight = "normal";
    this.isOptionsVisible = false;
    this.isStatsVisible = false;
  }
  toggleOptionsPanel() {
    if (!this.isOptionsVisible) {
      this.buildingPanel.style.visibility = "collapse";
      this.statsPanel.style.visibility = "collapse";
      this.statsButton.style.fontWeight = "normal";
      this.settingsPanel.style.visibility = "visible";
      this.optionsButton.style.fontWeight = "bold";
      this.isOptionsVisible = true;
      this.isStatsVisible = false;
    } else {
      this.showBuildingPanel();
    }
  }
  toggleStatsPanel() {
    if (!this.isStatsVisible) {
      this.buildingPanel.style.visibility = "collapse";
      this.settingsPanel.style.visibility = "collapse";
      this.optionsButton.style.fontWeight = "normal";
      this.statsPanel.style.visibility = "visible";
      this.statsButton.style.fontWeight = "bold";
      this.isStatsVisible = true;
      this.isOptionsVisible = false;
    } else {
      this.showBuildingPanel();
    }
  }
  addEventListeners() {
    this.optionsButton.addEventListener("click", () =>
      this.toggleOptionsPanel(),
    );
    this.statsButton.addEventListener("click", () => this.toggleStatsPanel());
    this.saveButton.addEventListener("click", () => {
      this.stats.saveStatsToStorage();
      alert("Stats saved to cookie!");
    });
  }
}

class ResetModal {
  constructor(cookieCounter, stats) {
    this.cookieCounter = cookieCounter;
    this.stats = stats;
    this.resetButton = document.getElementById("reset");

    this.popup = document.getElementById("resetModal");
    this.confirmResetButton = document.getElementById("confirm-reset");
    this.cancelResetButton = document.getElementById("cancel-reset");

    this.resetButton.addEventListener("click", () => this.showPopup());
    this.confirmResetButton.addEventListener("click", () =>
      this.confirmReset(),
    );
    this.cancelResetButton.addEventListener("click", () => this.hidePopup());
  }

  showPopup() {
    console.log("showPopup");
    this.popup.style.display = "block";
    this.popup.style.visibility = "visible";
  }

  hidePopup() {
    console.log("hidePopup");
    this.popup.style.display = "none";
  }

  confirmReset() {
    this.cookieCounter.reset();
    this.stats.reset();
    this.hidePopup();
    alert("The game has been reset.");

    console.log("Reset button clicked");
    this.resetButton.addEventListener("click", () => {
      console.log("Popup shown");
      this.showPopup();
    });
  }
}

class MilkWave {
  constructor(canvasId, imageUrl, speed = 1, imgWidth = 600) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    this.speed = speed;
    this.imgWidth = imgWidth;
    this.xPos1 = 0;
    this.xPos2 = this.imgWidth;

    this.milkImage = new Image();
    this.setImage(imageUrl); // Use setImage to initialize the image and start animation

    this.animate = this.animate.bind(this);
    this.adjustCanvasHeight = this.adjustCanvasHeight.bind(this);

    window.addEventListener("resize", this.adjustCanvasHeight);
    this.newColorListener();
  }

  setImage(imageUrl) {
    this.milkImage.src = imageUrl;
    this.milkImage.onload = () => {
      this.adjustCanvasHeight();
      if (!this.isAnimating) {
        this.isAnimating = true;
        this.animate();
      }
    };
  }

  adjustCanvasHeight() {
    const canvasRect = this.canvas.getBoundingClientRect();
    const availableHeight = window.innerHeight - canvasRect.top;
    const newHeight = Math.min(availableHeight, 512);

    this.canvas.height = newHeight;
    this.canvas.width = canvasRect.width;
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.drawImage(
      this.milkImage,
      this.xPos1,
      0,
      this.imgWidth,
      this.canvas.height,
    );
    this.ctx.drawImage(
      this.milkImage,
      this.xPos2,
      0,
      this.imgWidth,
      this.canvas.height,
    );

    this.xPos1 -= this.speed;
    this.xPos2 -= this.speed;

    if (this.xPos1 <= -this.imgWidth) {
      this.xPos1 = this.imgWidth;
    }
    if (this.xPos2 <= -this.imgWidth) {
      this.xPos2 = this.imgWidth;
    }

    requestAnimationFrame(this.animate);
  }

  // Method to change the sprite image during animation
  changeSprite(newImageUrl) {
    this.setImage(newImageUrl);
  }

  newColorListener() {
    document.getElementById;
    document
      .getElementById("milkPlain")
      .addEventListener("click", () =>
        this.changeSprite("images/milkWave.png"),
      );
    document
      .getElementById("milkBlueFire")
      .addEventListener("click", () =>
        this.changeSprite("images/milkBlueFire.png"),
      );
    document
      .getElementById("milkOrange")
      .addEventListener("click", () =>
        this.changeSprite("images/milkOrange.png"),
      );
    document
      .getElementById("milkHazelnut")
      .addEventListener("click", () =>
        this.changeSprite("images/milkHazelnut.png"),
      );
    document
      .getElementById("milkPeach")
      .addEventListener("click", () =>
        this.changeSprite("images/milkPeach.png"),
      );
    document
      .getElementById("milkZebra")
      .addEventListener("click", () =>
        this.changeSprite("images/milkZebra.png"),
      );
  }
}
document.getelement;

class BackgroundChanger {
  constructor() {
    const backgroundElement = document.querySelector("body");

    document
      .getElementById("bgRed")
      .addEventListener(
        "click",
        () =>
          (backgroundElement.style.backgroundImage = "url(images/bgRed.jpg)"),
      );
    document
      .getElementById("bgSnow")
      .addEventListener(
        "click",
        () =>
          (backgroundElement.style.backgroundImage = "url(images/bgSnowy.jpg)"),
      );
    document
      .getElementById("bgGold")
      .addEventListener(
        "click",
        () =>
          (backgroundElement.style.backgroundImage = "url(images/bgGold.jpg)"),
      );
    document
      .getElementById("bgMint")
      .addEventListener(
        "click",
        () =>
          (backgroundElement.style.backgroundImage = "url(images/bgMint.jpg)"),
      );
    document
      .getElementById("bgMoney")
      .addEventListener(
        "click",
        () =>
          (backgroundElement.style.backgroundImage = "url(images/bgMoney.jpg)"),
      );
    document
      .getElementById("bgPink")
      .addEventListener(
        "click",
        () =>
          (backgroundElement.style.backgroundImage = "url(images/bgPink.jpg)"),
      );
    document
      .getElementById("bgPurple")
      .addEventListener(
        "click",
        () =>
          (backgroundElement.style.backgroundImage =
            "url(images/bgPurple.jpg)"),
      );
    document
      .getElementById("bgSilver")
      .addEventListener(
        "click",
        () =>
          (backgroundElement.style.backgroundImage =
            "url(images/bgSilver.jpg)"),
      );
    document
      .getElementById("bgSky")
      .addEventListener(
        "click",
        () =>
          (backgroundElement.style.backgroundImage = "url(images/bgSky.jpg)"),
      );
  }
}

document.addEventListener("DOMContentLoaded", () => new Game());
