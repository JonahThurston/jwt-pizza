import { test, expect } from "playwright-test-coverage";

test("home page", async ({ page }) => {
  await page.goto("/");

  expect(await page.title()).toBe("JWT Pizza");
});

test("purchase with login", async ({ page }) => {
  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: 2,
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  await page.route("*/**/api/franchise", async (route) => {
    const franchiseRes = [
      {
        id: 2,
        name: "LotaPizza",
        stores: [
          { id: 4, name: "Lehi" },
          { id: 5, name: "Springville" },
          { id: 6, name: "American Fork" },
        ],
      },
      { id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
      { id: 4, name: "topSpot", stores: [] },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "d@jwt.com", password: "a" };
    const loginRes = {
      user: {
        id: 3,
        name: "Kai Chen",
        email: "d@jwt.com",
        roles: [{ role: "diner" }],
      },
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route("*/**/api/order", async (route) => {
    const orderReq = {
      items: [
        { menuId: 1, description: "Veggie", price: 0.0038 },
        { menuId: 2, description: "Pepperoni", price: 0.0042 },
      ],
      storeId: "4",
      franchiseId: 2,
    };
    const orderRes = {
      order: {
        items: [
          { menuId: 1, description: "Veggie", price: 0.0038 },
          { menuId: 2, description: "Pepperoni", price: 0.0042 },
        ],
        storeId: "4",
        franchiseId: 2,
        id: 23,
      },
      jwt: "eyJpYXQ",
    };
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject(orderReq);
    await route.fulfill({ json: orderRes });
  });

  await page.goto("/");

  // Go to order page
  await page.getByRole("button", { name: "Order now" }).click();

  // Create order
  await expect(page.locator("h2")).toContainText("Awesome is a click away");
  await page.getByRole("combobox").selectOption("4");
  await page.getByRole("link", { name: "Image Description Veggie A" }).click();
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await expect(page.locator("form")).toContainText("Selected pizzas: 2");
  await page.getByRole("button", { name: "Checkout" }).click();

  // Login
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  // Pay
  await expect(page.getByRole("main")).toContainText(
    "Send me those 2 pizzas right now!"
  );
  await expect(page.locator("tbody")).toContainText("Veggie");
  await expect(page.locator("tbody")).toContainText("Pepperoni");
  await expect(page.locator("tfoot")).toContainText("0.008 ₿");
  await page.getByRole("button", { name: "Pay now" }).click();

  // Check balance
  await expect(page.getByText("0.008")).toBeVisible();
});

test("registerAndLogout", async ({ page }) => {
  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      const registerReq = {
        name: "bigGuy",
        email: "bg@jwt.com",
        password: "pass",
      };
      const registerRes = {
        user: {
          id: 83,
          name: "bigGuy",
          email: "bg@jwt.com",
          roles: [{ role: "diner" }],
        },
        token: "abcdef",
      };
      expect(route.request().postDataJSON()).toMatchObject(registerReq);
      await route.fulfill({ json: registerRes });
    } else if (method === "DELETE") {
      const logoutRes = {
        message: "logout successful",
      };
      await route.fulfill({ json: logoutRes });
    } else {
      throw new Error(
        `Unexpected request method: ${method} for ${route.request().url()}`
      );
    }
  });

  await page.goto("http://localhost:5173/");

  //navigate to register page
  await page.getByRole("link", { name: "Register" }).click();
  await expect(page.getByRole("heading")).toContainText("Welcome to the party");

  //fill in info
  await page.getByRole("textbox", { name: "Full name" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("bigGuy");
  await page.getByRole("textbox", { name: "Full name" }).press("Tab");
  await page.getByRole("textbox", { name: "Email address" }).fill("bg@jwt.com");
  await page.getByRole("textbox", { name: "Email address" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("pass");

  //click register
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.locator("#navbar-dark")).toContainText("Logout");

  //click logout
  await page.getByRole("link", { name: "Logout" }).click();
  await expect(page.locator("#navbar-dark")).toContainText("Login");
});

test("admin dashboard", async ({ page }) => {
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "deen@jwt.com", password: "pass" };
    const loginRes = {
      user: {
        id: 3,
        name: "deen",
        email: "deen@jwt.com",
        roles: [{ role: "admin" }],
      },
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route("*/**/api/franchise", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const franchiseRes = [
        {
          id: 2,
          name: "LotaPizza",
          stores: [
            { id: 4, name: "Lehi" },
            { id: 5, name: "Springville" },
            { id: 6, name: "American Fork" },
          ],
        },
        { id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
        { id: 4, name: "topSpot", stores: [] },
      ];
      await route.fulfill({ json: franchiseRes });
    } else if (method === "POST") {
      const creFranchReq = {
        name: "testFranchise",
        admins: [{ email: "f@jwt.com" }],
      };
      const creFrnchRes = {
        name: "testFranchise",
        admins: [{ email: "f@jwt.com", id: 4, name: "pizza franchisee" }],
        id: 1,
      };
      expect(route.request().postDataJSON()).toMatchObject(creFranchReq);
      await route.fulfill({ json: creFrnchRes });
    } else {
      throw new Error(
        `Unexpected request method: ${method} for ${route.request().url()}`
      );
    }
  });

  await page.route("*/**/api/franchise/*", async (route) => {
    const delFrnchRes = {
      message: "franchise deleted",
    };
    expect(route.request().method()).toBe("DELETE");
    await route.fulfill({ json: delFrnchRes });
  });

  await page.goto("http://localhost:5173/");

  //login
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).click();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("deen@jwt.com");
  await page.getByRole("textbox", { name: "Email address" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("pass");
  await page.getByRole("button", { name: "Login" }).click();

  //navigate to admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page.getByRole("heading")).toContainText("Mama Ricci's kitchen");
  await expect(page.locator("thead")).toContainText("Franchise");

  //open a franchise
  await page.getByRole("button", { name: "Add Franchise" }).click();
  await expect(page.getByRole("heading")).toContainText("Create franchise");
  await page.getByRole("textbox", { name: "franchise name" }).click();
  await page
    .getByRole("textbox", { name: "franchise name" })
    .fill("testFranchise");
  await page.getByRole("textbox", { name: "franchise name" }).press("Tab");
  await page
    .getByRole("textbox", { name: "franchisee admin email" })
    .fill("f@jwt.com");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading")).toContainText("Mama Ricci's kitchen");

  //close a franchise
  await page
    .getByRole("row", { name: "LotaPizza Close" })
    .getByRole("button")
    .click();
  await expect(page.getByRole("heading")).toContainText("Sorry to see you go");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading")).toContainText("Mama Ricci's kitchen");
});

test("docs, history, about, franchise", async ({ page }) => {
  await page.goto("http://localhost:5173/docs");
  await expect(page.getByRole("heading")).toContainText("JWT Pizza API");
  await page.getByRole("link", { name: "home" }).click();
  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("main")).toContainText("The secret sauce");
  await page.getByRole("link", { name: "home" }).click();
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByRole("heading")).toContainText("Mama Rucci, my my");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Franchise" })
    .click();
  await expect(page.getByRole("main")).toContainText(
    "So you want a piece of the pie?"
  );
});

test("diner Dashboard", async ({ page }) => {
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "d@jwt.com", password: "a" };
    const loginRes = {
      user: {
        id: 3,
        name: "Kai Chen",
        email: "d@jwt.com",
        roles: [{ role: "diner" }],
      },
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route("*/**/api/order", async (route) => {
    const orderRes = {
      dinerId: 3,
      orders: [],
      page: 1,
    };
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: orderRes });
  });

  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Email address" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("link", { name: "KC" }).click();
  await expect(page.getByRole("heading")).toContainText("Your pizza kitchen");
});
