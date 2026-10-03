(() => {
    "use strict";

    const BOOKS_KEY = "bookstore_books_v1";
    const SALES_KEY = "bookstore_sales_v1";
    const $ = (id) => document.getElementById(id);
    const money = (amount) => new Intl.NumberFormat("en-IN", {
        style: "currency", currency: "INR"
    }).format(Number(amount) || 0);

    let books = loadArray(BOOKS_KEY);
    let sales = loadArray(SALES_KEY);
    let toastTimer;

    function loadArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    }

    function saveData() {
        try {
            localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
            localStorage.setItem(SALES_KEY, JSON.stringify(sales));
            return true;
        } catch (error) {
            showToast("Could not save data. Check browser storage settings.");
            console.error(error);
            return false;
        }
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char]);
    }

    function showToast(message) {
        const toast = $("toast");
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
    }

    function showPage(page) {
        document.querySelectorAll(".page").forEach((section) => {
            section.classList.toggle("active", section.id === `page-${page}`);
        });
        document.querySelectorAll(".nav-btn").forEach((button) => {
            button.classList.toggle("active", button.dataset.page === page);
        });
        if (page === "dashboard") renderDashboard();
        if (page === "inventory") renderInventory();
        if (page === "sales") renderSales();
        if (page === "reports") renderReports();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function openBookDialog(book = null) {
        $("book-form").reset();
        $("book-error").classList.add("hidden");
        $("book-id").value = book ? book.id : "";
        $("dialog-title").textContent = book ? "Edit book" : "Add a book";
        $("book-title").value = book ? book.title : "";
        $("book-author").value = book ? book.author : "";
        $("book-price").value = book ? book.price : "";
        $("book-quantity").value = book ? book.quantity : "";
        $("book-dialog").showModal();
        $("book-title").focus();
    }

    function closeBookDialog() {
        $("book-dialog").close();
    }

    function renderDashboard() {
        const stockCount = books.reduce((sum, book) => sum + Number(book.quantity), 0);
        const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
        $("stat-titles").textContent = books.length;
        $("stat-stock").textContent = stockCount;
        $("stat-low").textContent = books.filter((book) => book.quantity <= 5).length;
        $("stat-sales").textContent = money(totalSales);

        const recent = [...books].slice(-5).reverse();
        $("recent-books").innerHTML = recent.map((book) => `
      <tr>
        <td class="book-name">${escapeHTML(book.title)}</td>
        <td>${escapeHTML(book.author)}</td>
        <td>${money(book.price)}</td>
        <td class="${book.quantity <= 5 ? "stock-low" : "stock-ok"}">${book.quantity}</td>
      </tr>`).join("");
        $("recent-empty").classList.toggle("hidden", recent.length > 0);

        const selected = $("sale-book").value;
        $("sale-book").innerHTML = '<option value="">Select a book</option>' +
            books.filter((book) => book.quantity > 0).map((book) =>
                `<option value="${book.id}">${escapeHTML(book.title)} — ${book.quantity} in stock</option>`
            ).join("");
        if (books.some((book) => String(book.id) === selected && book.quantity > 0)) {
            $("sale-book").value = selected;
        }
        updateSaleTotal();
    }

    function renderInventory() {
        const query = $("book-search").value.trim().toLowerCase();
        const filtered = books.filter((book) =>
            [book.id, book.title, book.author].some((value) =>
                String(value).toLowerCase().includes(query)
            )
        );
        $("inventory-count").textContent = `${filtered.length} of ${books.length} titles`;
        $("inventory-body").innerHTML = filtered.map((book) => {
            const status = book.quantity === 0
                ? '<span class="status out">Out of stock</span>'
                : book.quantity <= 5
                    ? '<span class="status low">Low stock</span>'
                    : '<span class="status in">In stock</span>';
            return `<tr>
        <td class="id-cell">#${book.id}</td>
        <td class="book-name">${escapeHTML(book.title)}</td>
        <td>${escapeHTML(book.author)}</td>
        <td>${money(book.price)}</td>
        <td class="${book.quantity <= 5 ? "stock-low" : "stock-ok"}">${book.quantity}</td>
        <td>${status}</td>
        <td><div class="actions">
          <button class="small-btn edit" data-action="edit" data-id="${book.id}">Edit</button>
          <button class="small-btn delete" data-action="delete" data-id="${book.id}">Delete</button>
        </div></td>
      </tr>`;
        }).join("");
        $("inventory-empty").classList.toggle("hidden", filtered.length > 0);
    }

    function updateSaleTotal() {
        const id = Number($("sale-book").value);
        const quantity = Math.max(0, Number($("sale-quantity").value) || 0);
        const book = books.find((item) => item.id === id);
        $("sale-total").textContent = money(book ? book.price * quantity : 0);
    }

    function renderSales() {
        const query = $("sales-search").value.trim().toLowerCase();
        const filtered = [...sales].reverse().filter((sale) =>
            [sale.id, sale.title, sale.author].some((value) =>
                String(value || "").toLowerCase().includes(query)
            )
        );
        $("sales-body").innerHTML = filtered.map((sale) => `
      <tr>
        <td class="id-cell">#${sale.id}</td>
        <td>${escapeHTML(new Date(sale.date).toLocaleString("en-IN"))}</td>
        <td class="book-name">${escapeHTML(sale.title)}</td>
        <td>${sale.quantity}</td>
        <td>${money(sale.unitPrice)}</td>
        <td><strong>${money(sale.total)}</strong></td>
      </tr>`).join("");
        $("sales-empty").classList.toggle("hidden", filtered.length > 0);
        $("sales-count").textContent = sales.length;
        $("units-sold").textContent = sales.reduce((sum, sale) => sum + sale.quantity, 0);
        $("sales-revenue").textContent = money(sales.reduce((sum, sale) => sum + sale.total, 0));
    }

    function renderReports() {
        const stockValue = books.reduce((sum, book) => sum + book.price * book.quantity, 0);
        const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        $("report-value").textContent = money(stockValue);
        $("report-average").textContent = money(sales.length ? revenue / sales.length : 0);
        $("report-out").textContent = books.filter((book) => book.quantity === 0).length;

        const soldByTitle = {};
        sales.forEach((sale) => {
            soldByTitle[sale.title] = (soldByTitle[sale.title] || 0) + sale.quantity;
        });
        const top = Object.entries(soldByTitle).sort((a, b) => b[1] - a[1])[0];
        $("report-top").textContent = top ? `${top[0]} (${top[1]})` : "—";

        const low = books.filter((book) => book.quantity <= 5).sort((a, b) => a.quantity - b.quantity);
        $("low-stock-body").innerHTML = low.map((book) => `
      <tr><td class="book-name">${escapeHTML(book.title)}</td>
      <td>${escapeHTML(book.author)}</td>
      <td class="${book.quantity <= 5 ? "stock-low" : ""}">${book.quantity}</td>
      <td>${money(book.price)}</td></tr>`).join("");
        $("low-stock-empty").classList.toggle("hidden", low.length > 0);
    }

    function saveBook(event) {
        event.preventDefault();
        const id = $("book-id").value ? Number($("book-id").value) : null;
        const title = $("book-title").value.trim();
        const author = $("book-author").value.trim();
        const price = Number($("book-price").value);
        const quantity = Number($("book-quantity").value);
        const error = $("book-error");

        if (!title || !author || !Number.isFinite(price) || price <= 0 ||
            !Number.isInteger(quantity) || quantity < 0) {
            error.textContent = "Enter a title, author, positive price and whole-number quantity (0 or more).";
            error.classList.remove("hidden");
            return;
        }

        if (id !== null) {
            const index = books.findIndex((book) => book.id === id);
            if (index < 0) {
                error.textContent = "This book no longer exists. Refresh and try again.";
                error.classList.remove("hidden");
                return;
            }
            books[index] = { ...books[index], title, author, price, quantity };
        } else {
            const nextId = books.reduce((max, book) => Math.max(max, book.id), 0) + 1;
            books.push({ id: nextId, title, author, price, quantity, createdAt: new Date().toISOString() });
        }

        if (saveData()) {
            closeBookDialog();
            renderDashboard();
            renderInventory();
            renderReports();
            showToast(id === null ? "Book added successfully." : "Book updated successfully.");
        }
    }

    function deleteBook(id) {
        const book = books.find((item) => item.id === id);
        if (!book) return;
        if (!confirm(`Delete "${book.title}" from inventory? Past sales will remain in sales history.`)) return;
        books = books.filter((item) => item.id !== id);
        if (saveData()) {
            renderInventory();
            renderDashboard();
            renderReports();
            showToast("Book deleted.");
        }
    }

    function recordSale(event) {
        event.preventDefault();
        const id = Number($("sale-book").value);
        const quantity = Number($("sale-quantity").value);
        const book = books.find((item) => item.id === id);
        if (!book) return showToast("Please select a book.");
        if (!Number.isInteger(quantity) || quantity < 1) return showToast("Enter a valid quantity.");
        if (quantity > book.quantity) return showToast("Not enough stock available.");

        const saleId = sales.reduce((max, sale) => Math.max(max, sale.id), 0) + 1;
        sales.push({
            id: saleId, bookId: book.id, title: book.title, author: book.author,
            quantity, unitPrice: book.price, total: Number((book.price * quantity).toFixed(2)),
            date: new Date().toISOString()
        });
        book.quantity -= quantity;
        if (saveData()) {
            $("sale-quantity").value = 1;
            renderDashboard();
            renderInventory();
            renderSales();
            renderReports();
            showToast(`Sale recorded. Total: ${money(book.price * quantity)}`);
        }
    }

    function downloadCSV(filename, rows) {
        if (!rows.length) return showToast("There is no data to export.");
        const csv = rows.map((row) => row.map((cell) => {
            let value = String(cell ?? "");
            if (/^[=+\-@]/.test(value)) value = "'" + value;
            return `"${value.replace(/"/g, '""')}"`;
        }).join(",")).join("\r\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function seedDemoData() {
        if (books.length || sales.length) return;
        books = [
            { id: 1, title: "The Alchemist", author: "Paulo Coelho", price: 299, quantity: 10 },
            { id: 2, title: "Wings of Fire", author: "A. P. J. Abdul Kalam", price: 250, quantity: 15 },
            { id: 3, title: "Atomic Habits", author: "James Clear", price: 399, quantity: 4 },
            { id: 4, title: "Harry Potter and the Philosopher's Stone", author: "J. K. Rowling", price: 450, quantity: 0 },
            { id: 5, title: "The Great Gatsby", author: "F. Scott Fitzgerald", price: 350, quantity: 5 },
            { id: 6, title: "To Kill a Mockingbird", author: "Harper Lee", price: 400, quantity: 8 },
            { id: 7, title: "Gitanjali", author: "Rabindranath Tagore", price: 499, quantity: 12 },
            { id: 8, title: "The Catcher in the Rye", author: "J. D. Salinger", price: 320, quantity: 4 },
            { id: 9, title: "Pride and Prejudice", author: "Jane Austen", price: 380, quantity: 6 },
            { id: 10, title: "The Hobbit", author: "J. R. R. Tolkien", price: 550, quantity: 3 },

            { id: 11, title: "1984", author: "George Orwell", price: 299, quantity: 11 },
            { id: 12, title: "Animal Farm", author: "George Orwell", price: 220, quantity: 14 },
            { id: 13, title: "The Kite Runner", author: "Khaled Hosseini", price: 399, quantity: 7 },
            { id: 14, title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", price: 350, quantity: 10 },
            { id: 15, title: "Think and Grow Rich", author: "Napoleon Hill", price: 280, quantity: 9 },
            { id: 16, title: "The Psychology of Money", author: "Morgan Housel", price: 399, quantity: 13 },
            { id: 17, title: "Ikigai", author: "Hector Garcia", price: 299, quantity: 8 },
            { id: 18, title: "Deep Work", author: "Cal Newport", price: 450, quantity: 5 },
            { id: 19, title: "The Power of Habit", author: "Charles Duhigg", price: 399, quantity: 6 },
            { id: 20, title: "Sapiens", author: "Yuval Noah Harari", price: 599, quantity: 4 },

            { id: 21, title: "The Book Thief", author: "Markus Zusak", price: 450, quantity: 7 },
            { id: 22, title: "The Fault in Our Stars", author: "John Green", price: 299, quantity: 10 },
            { id: 23, title: "The Hunger Games", author: "Suzanne Collins", price: 350, quantity: 6 },
            { id: 24, title: "The Lord of the Rings", author: "J. R. R. Tolkien", price: 699, quantity: 3 },
            { id: 25, title: "The Chronicles of Narnia", author: "C. S. Lewis", price: 499, quantity: 5 },
            { id: 26, title: "The Little Prince", author: "Antoine de Saint-Exupéry", price: 250, quantity: 12 },
            { id: 27, title: "Don Quixote", author: "Miguel de Cervantes", price: 550, quantity: 4 },
            { id: 28, title: "The Diary of a Young Girl", author: "Anne Frank", price: 299, quantity: 9 },
            { id: 29, title: "A Brief History of Time", author: "Stephen Hawking", price: 499, quantity: 5 },
            { id: 30, title: "The 7 Habits of Highly Effective People", author: "Stephen R. Covey", price: 450, quantity: 8 }
        ];
        saveData();
    }

    document.querySelectorAll("[data-page]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            showPage(button.dataset.page);
        });
    });
    document.querySelectorAll("[data-goto]").forEach((button) =>
        button.addEventListener("click", () => showPage(button.dataset.goto))
    );
    $("dashboard-add").addEventListener("click", () => openBookDialog());
    $("inventory-add").addEventListener("click", () => openBookDialog());
    $("close-dialog").addEventListener("click", closeBookDialog);
    $("cancel-dialog").addEventListener("click", closeBookDialog);
    $("book-form").addEventListener("submit", saveBook);
    $("sale-form").addEventListener("submit", recordSale);
    $("sale-book").addEventListener("change", updateSaleTotal);
    $("sale-quantity").addEventListener("input", updateSaleTotal);
    $("book-search").addEventListener("input", renderInventory);
    $("sales-search").addEventListener("input", renderSales);

    $("inventory-body").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const id = Number(button.dataset.id);
        if (button.dataset.action === "edit") {
            const book = books.find((item) => item.id === id);
            if (book) openBookDialog(book);
        } else if (button.dataset.action === "delete") {
            deleteBook(id);
        }
    });

    $("export-books").addEventListener("click", () => downloadCSV("bookstore-inventory.csv", [
        ["ID", "Title", "Author", "Price (INR)", "Quantity"],
        ...books.map((book) => [book.id, book.title, book.author, book.price, book.quantity])
    ]));
    $("export-sales").addEventListener("click", () => downloadCSV("bookstore-sales.csv", [
        ["Sale ID", "Date", "Book", "Author", "Quantity", "Unit Price", "Total"],
        ...sales.map((sale) => [sale.id, new Date(sale.date).toLocaleString("en-IN"), sale.title, sale.author, sale.quantity, sale.unitPrice, sale.total])
    ]));

    $("reset-data").addEventListener("click", () => {
        if (!confirm("This will permanently delete all bookstore books and sales saved by this project in this browser. Continue?")) return;
        books = [];
        sales = [];
        if (saveData()) {
            renderDashboard();
            renderInventory();
            renderSales();
            renderReports();
            showToast("Project data reset.");
        }
    });

    seedDemoData();
    renderDashboard();
    renderInventory();
    renderSales();
    renderReports();
})();