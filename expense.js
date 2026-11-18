
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const DATA_FILE = path.join(__dirname, "expenses.json");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let expenses = loadExpenses();
let monthlyBudget = loadBudget();

// Load saved expenses
function loadExpenses() {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        return Array.isArray(data.expenses)
            ? data.expenses
            : [];
    } catch (error) {
        console.log("Error loading expense data.");
        return [];
    }
}

// Load monthly budget
function loadBudget() {
    try {
        if (!fs.existsSync(DATA_FILE)) return 0;

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        return Number(data.monthlyBudget) || 0;
    } catch {
        return 0;
    }
}

// Save expenses and budget
function saveData() {
    const data = {
        monthlyBudget,
        expenses
    };

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

// Get user input
function ask(question) {
    return new Promise(resolve => {
        rl.question(question, answer => {
            resolve(answer.trim());
        });
    });
}

// Format currency
function money(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}

// Get current month
function currentMonth() {
    const date = new Date();

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}`;
}

// Validate amount
function validAmount(value) {
    const amount = Number(value);

    return Number.isFinite(amount) && amount > 0
        ? amount
        : null;
}

// Validate date
function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00`);

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

// Display individual expense
function printExpense(expense) {
    console.log(
        `ID: ${expense.id} | ` +
        `Date: ${expense.date} | ` +
        `Category: ${expense.category} | ` +
        `Amount: ${money(expense.amount)} | ` +
        `Note: ${expense.note || "-"}`
    );
}

// Add expense
async function addExpense() {
    console.log("\n--- Add Expense ---");

    const amountInput = await ask("Enter amount: ");
    const amount = validAmount(amountInput);

    if (!amount) {
        console.log("Invalid amount.");
        return;
    }

    const category = await ask("Enter category: ");

    if (!category) {
        console.log("Category cannot be empty.");
        return;
    }

    const dateInput = await ask(
        "Enter date (YYYY-MM-DD, blank for today): "
    );

    const date = dateInput ||
        new Date().toISOString().slice(0, 10);

    if (!validDate(date)) {
        console.log("Invalid date.");
        return;
    }

    const note = await ask("Enter note (optional): ");

    const id = expenses.length
        ? Math.max(...expenses.map(e => e.id)) + 1
        : 1;

    const expense = {
        id,
        amount,
        category:
            category[0].toUpperCase() + category.slice(1),
        date,
        note
    };

    expenses.push(expense);

    saveData();

    console.log("\nExpense added successfully!");

    checkBudget();
}

// View all expenses
function listExpenses(list = expenses) {
    console.log("\n--- All Expenses ---");

    if (list.length === 0) {
        console.log("No expenses found.");
        return;
    }

    const sorted = [...list].sort((a, b) =>
        b.date.localeCompare(a.date)
    );

    sorted.forEach(printExpense);

    const total = list.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    console.log("\nTotal:", money(total));
}

// Filter expenses
async function filterExpenses() {
    console.log("\n1. Filter by month");
    console.log("2. Filter by category");

    const choice = await ask("Choose option: ");

    let filtered = [];

    if (choice === "1") {
        const month = await ask(
            "Enter month (YYYY-MM): "
        );

        if (!/^\d{4}-\d{2}$/.test(month)) {
            console.log("Invalid month format.");
            return;
        }

        filtered = expenses.filter(expense =>
            expense.date.startsWith(month)
        );

    } else if (choice === "2") {
        const category = (
            await ask("Enter category: ")
        ).toLowerCase();

        filtered = expenses.filter(expense =>
            expense.category.toLowerCase() === category
        );

    } else {
        console.log("Invalid option.");
        return;
    }

    listExpenses(filtered);
}

// Delete expense
async function deleteExpense() {
    const id = Number(
        await ask("Enter expense ID: ")
    );

    const index = expenses.findIndex(
        expense => expense.id === id
    );

    if (index === -1) {
        console.log("Expense not found.");
        return;
    }

    const removed = expenses.splice(index, 1)[0];

    saveData();

    console.log(
        `Deleted expense: ${money(removed.amount)}`
    );
}

// Monthly summary
function showSummary() {
    const month = currentMonth();

    const monthlyExpenses = expenses.filter(
        expense => expense.date.startsWith(month)
    );

    const total = monthlyExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    const categoryTotals = {};

    for (const expense of monthlyExpenses) {
        const category = expense.category;

        categoryTotals[category] =
            (categoryTotals[category] || 0) +
            expense.amount;
    }

    console.log(`\n--- Monthly Summary: ${month} ---`);

    console.log(
        "Number of expenses:",
        monthlyExpenses.length
    );

    console.log("Total spent:", money(total));

    if (monthlyExpenses.length > 0) {
        console.log(
            "Average expense:",
            money(total / monthlyExpenses.length)
        );
    }

    console.log("\nSpending by category:");

    const categories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]);

    if (categories.length === 0) {
        console.log("No expenses this month.");
    }

    categories.forEach(([category, amount]) => {
        const percentage = total
            ? (amount / total) * 100
            : 0;

        console.log(
            `${category}: ${money(amount)} ` +
            `(${percentage.toFixed(1)}%)`
        );
    });

    if (monthlyBudget > 0) {
        console.log("\nMonthly budget:", money(monthlyBudget));

        console.log(
            "Remaining:",
            money(monthlyBudget - total)
        );
    }
}

// Set monthly budget
async function setBudget() {
    const input = await ask(
        "Enter monthly budget: "
    );

    const amount = validAmount(input);

    if (!amount) {
        console.log("Invalid budget.");
        return;
    }

    monthlyBudget = amount;

    saveData();

    console.log(
        "Monthly budget set to:",
        money(monthlyBudget)
    );

    checkBudget();
}

// Check budget
function checkBudget() {
    if (monthlyBudget <= 0) return;

    const spent = expenses
        .filter(expense =>
            expense.date.startsWith(currentMonth())
        )
        .reduce(
            (sum, expense) => sum + expense.amount,
            0
        );

    if (spent > monthlyBudget) {
        console.log(
            "\nWARNING! Budget exceeded by:",
            money(spent - monthlyBudget)
        );
    } else {
        console.log(
            "Budget remaining:",
            money(monthlyBudget - spent)
        );
    }
}

// Main menu
function showMenu() {
    console.log(`
================================
       POCKET EXPENSE TRACKER
================================

1. Add Expense
2. View All Expenses
3. Filter Expenses
4. Delete Expense
5. Monthly Summary
6. Set Monthly Budget
7. Exit

================================
`);
}

// Application controller
async function main() {
    console.log("Welcome to Pocket Expense Tracker!");

    while (true) {
        showMenu();

        const choice = await ask(
            "Select an option: "
        );

        switch (choice) {
            case "1":
                await addExpense();
                break;

            case "2":
                listExpenses();
                break;

            case "3":
                await filterExpenses();
                break;

            case "4":
                await deleteExpense();
                break;

            case "5":
                showSummary();
                break;

            case "6":
                await setBudget();
                break;

            case "7":
                saveData();
                console.log("Thank you for using the app!");

                rl.close();
                return;

            default:
                console.log("Invalid choice. Try again.");
        }
    }
}

main().catch(error => {
    console.error("Unexpected error:", error);
    rl.close();
});
