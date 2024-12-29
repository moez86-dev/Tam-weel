document.getElementById("loanForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const loanAmount = parseFloat(document.getElementById("loanAmount").value);
    const loanDuration = parseInt(document.getElementById("loanDuration").value) * 12; // الأشهر
    const interestRate = parseFloat(document.getElementById("interestRate").value) / 100 / 12; // نسبة الفائدة الشهرية
    const loanStartDate = new Date(document.getElementById("loanStartDate").value);
    const firstPaymentDate = new Date(document.getElementById("firstPaymentDate").value);
    const gracePeriodType = document.getElementById("gracePeriodType").value;
    const gracePeriodMethod = document.getElementById("gracePeriodMethod").value;

    // حساب فترة السماح
    const gracePeriodMonths = Math.max(
        (firstPaymentDate.getFullYear() - loanStartDate.getFullYear()) * 12 +
        (firstPaymentDate.getMonth() - loanStartDate.getMonth()),
        0
    );

    let adjustedLoanAmount = loanAmount; // المبلغ بعد تعديل فترة السماح
    let effectiveLoanDuration = loanDuration; // عدد الأشهر الفعلي

    if (gracePeriodType === "with-interest") {
        // إذا كانت فترة السماح مع فائدة
        const gracePeriodInterest = loanAmount * interestRate * gracePeriodMonths;
        adjustedLoanAmount += gracePeriodInterest;
    }

    if (gracePeriodType !== "no-grace" && gracePeriodMethod === "reduced") {
        // إذا كانت فترة السماح تؤثر على عدد الأقساط
        effectiveLoanDuration = loanDuration - gracePeriodMonths;
    }

    // حساب القسط الشهري
    const monthlyPayment = (adjustedLoanAmount * interestRate * Math.pow(1 + interestRate, effectiveLoanDuration)) /
        (Math.pow(1 + interestRate, effectiveLoanDuration) - 1);

    // إنشاء بيانات القرض
    const loanData = {
        loanAmount,
        adjustedLoanAmount,
        loanDuration: effectiveLoanDuration,
        interestRate,
        loanStartDate: loanStartDate.toISOString(),
        firstPaymentDate: firstPaymentDate.toISOString(),
        gracePeriodMonths,
        gracePeriodType,
        gracePeriodMethod,
        monthlyPayment,
        payments: []
    };

    let loans = JSON.parse(localStorage.getItem("loans")) || [];
    loans.push(loanData);
    localStorage.setItem("loans", JSON.stringify(loans));

    loadLoans();
    renderSchedule(loanData, loans.length - 1);
});

function loadLoans() {
    const loans = JSON.parse(localStorage.getItem("loans")) || [];
    const loanItems = document.getElementById("loanItems");
    loanItems.innerHTML = "";
    loans.forEach((loan, index) => {
        loanItems.innerHTML += `
            <li class="list-group-item">
                <i class="bi bi-cash-coin"></i> القرض #${index + 1}: مبلغ ${loan.loanAmount} ريال سعودي
                <button class="btn btn-sm btn-danger float-end" onclick="deleteLoan(${index})">
                    <i class="bi bi-trash"></i> حذف
                </button>
            </li>
        `;
    });
}

function deleteLoan(index) {
    let loans = JSON.parse(localStorage.getItem("loans")) || [];
    loans.splice(index, 1);
    localStorage.setItem("loans", JSON.stringify(loans));
    loadLoans();
    document.getElementById("result").innerHTML = "";
}

function renderSchedule(loanData, loanId) {
    const result = document.getElementById("result");
    let balance = loanData.adjustedLoanAmount;
    const startDate = new Date(loanData.firstPaymentDate);

    let schedule = `
        <h2>جدول السداد للقرض #${loanId + 1}</h2>
        <p>نوع فترة السماح: ${
            loanData.gracePeriodType === "no-grace"
                ? "بدون فترة سماح"
                : loanData.gracePeriodType === "no-interest"
                ? "بدون فائدة"
                : "مع فائدة"
        }</p>
        <p>طريقة الحساب: ${
            loanData.gracePeriodMethod === "fixed" ? "مدة ثابتة" : "مدة متغيرة"
        }</p>
        <p>مدة فترة السماح: ${
            loanData.gracePeriodType === "no-grace"
                ? "لا يوجد"
                : `${loanData.gracePeriodMonths} شهر`
        }</p>
        <table class="table table-bordered mt-3">
            <thead>
                <tr>
                    <th>القسط #</th>
                    <th>التاريخ (ميلادي)</th>
                    <th>الدفعة الشهرية</th>
                    <th>الفائدة الشهرية</th>
                    <th>المبلغ المتبقي</th>
                    <th>الحالة</th>
                    <th>إجراء</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (let i = 1; i <= loanData.loanDuration; i++) {
        const interestPayment = balance * loanData.interestRate;
        const principalPayment = loanData.monthlyPayment - interestPayment;
        balance -= principalPayment;

        const paymentDate = new Date(startDate);
        paymentDate.setMonth(startDate.getMonth() + i);

        schedule += `
            <tr>
                <td>${i}</td>
                <td>${paymentDate.toLocaleDateString("en-GB")}</td>
                <td>${loanData.monthlyPayment.toFixed(2)} ريال</td>
                <td>${interestPayment.toFixed(2)} ريال</td>
                <td>${balance.toFixed(2)} ريال</td>
                <td>${
                    loanData.payments.includes(i)
                        ? '<span class="text-success">مسدد</span>'
                        : '<span class="text-danger">غير مسدد</span>'
                }</td>
                <td>${
                    loanData.payments.includes(i)
                        ? ''
                        : `<button onclick="markAsPaid(${loanId}, ${i})" class="btn btn-success">سدد</button>`
                }</td>
            </tr>
        `;
    }

    schedule += `</tbody></table>`;
    result.innerHTML = schedule;
}

function markAsPaid(loanId, installmentNumber) {
    const loans = JSON.parse(localStorage.getItem("loans")) || [];
    const loan = loans[loanId];

    if (!loan.payments.includes(installmentNumber)) {
        loan.payments.push(installmentNumber);
    }

    localStorage.setItem("loans", JSON.stringify(loans));

    if (loan.payments.length === loan.loanDuration) {
        alert("🎉 مبروك! تم سداد جميع الدفعات!");
    }

    renderSchedule(loan, loanId);
}
document.getElementById("exportToExcel").addEventListener("click", function () {
    const resultTable = document.querySelector("#result table");
    if (!resultTable) {
        alert("⚠️ لا يوجد جدول سداد لتحويله إلى Excel!");
        return;
    }

    // إنشاء ورقة عمل من الجدول
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(resultTable);
    XLSX.utils.book_append_sheet(wb, ws, "جدول السداد");

    // تحميل ملف Excel
    XLSX.writeFile(wb, "جدول_السداد.xlsx");
});
// تجميد أو تمكين طريقة حساب فترة السماح بناءً على نوع فترة السماح
document.getElementById("gracePeriodType").addEventListener("change", function () {
    const gracePeriodMethod = document.getElementById("gracePeriodMethod");
    if (this.value === "no-grace") {
        gracePeriodMethod.disabled = true;
    } else {
        gracePeriodMethod.disabled = false;
    }
});

// تشغيل الخاصية في البداية إذا كان هناك قيمة محددة مسبقاً
document.getElementById("gracePeriodType").dispatchEvent(new Event("change"));
