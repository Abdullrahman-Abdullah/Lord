// Ensure you place the LocalForage script link in your HTML file
// <script src="https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"></script>

const app = {
    customers: [],
    sessions: [],
    activeTimers: {},
    currentCustomerId: null,
    init: function() {
        this.loadData();
        this.setupEventListeners();
        this.renderCustomers();
        this.updateStats();
        this.checkActiveSessions();
    },
    
    loadData: function() {
        const storedCustomers = localStorage.getItem('gamingCustomers');
        const storedSessions = localStorage.getItem('gamingSessions');
        const storedTimers = localStorage.getItem('gamingTimers');
        
        this.customers = storedCustomers ? JSON.parse(storedCustomers) : [];
        this.sessions = storedSessions ? JSON.parse(storedSessions) : [];
        this.activeTimers = storedTimers ? JSON.parse(storedTimers) : {};
    },
    
    saveData: function() {
        localStorage.setItem('gamingCustomers', JSON.stringify(this.customers));
        localStorage.setItem('gamingSessions', JSON.stringify(this.sessions));
        localStorage.setItem('gamingTimers', JSON.stringify(this.activeTimers));
    },
    
    setupEventListeners: function() {
        document.getElementById('customerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCustomer();
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.renderCustomers(e.target.value);
        });
        
        document.getElementById('sessionDuration').addEventListener('input', () => {
            this.calculateSessionTotal();
        });
        
        document.getElementById('sessionPrice').addEventListener('input', () => {
            this.calculateSessionTotal();
        });
        
        document.getElementById('useCredit').addEventListener('change', (e) => {
            this.toggleCreditUsage(e.target.checked);
        });
        
        document.getElementById('saveSession').addEventListener('click', () => {
            this.addSession();
        });
        
        document.getElementById('addNewSession').addEventListener('click', () => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('sessionsModal'));
            modal.hide();
            
            setTimeout(() => {
                this.openAddSessionModal(this.currentCustomerId);
            }, 500);
        });
        
        document.getElementById('syncTime').addEventListener('click', () => {
            this.syncSessionTime();
        });

        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        document.getElementById('clearAllData').addEventListener('click', () => {
            this.clearAllData();
        });
    },
    
    toggleCreditUsage: function(useCredit) {
        const durationInput = document.getElementById('sessionDuration');
        const priceInput = document.getElementById('sessionPrice');
        const availableCredit = document.getElementById('availableCredit');
        const usedCredit = document.getElementById('usedCredit');
        
        if (useCredit) {
            const customer = this.customers.find(c => c.id === this.currentCustomerId);
            const credit = customer.credit || 0;
            
            availableCredit.textContent = credit;
            
            if (credit > 0) {
                const maxDuration = Math.min(parseInt(durationInput.value), credit);
                durationInput.value = maxDuration;
                usedCredit.textContent = maxDuration;
                
                priceInput.disabled = true;
                priceInput.value = 0;
            } else {
                alert('لا يوجد رصيد كافي للاستخدام');
                document.getElementById('useCredit').checked = false;
                priceInput.disabled = false;
                usedCredit.textContent = '0';
            }
        } else {
            priceInput.disabled = false;
            priceInput.value = 5000;
            usedCredit.textContent = '0';
        }
        
        this.calculateSessionTotal();
    },
    
    syncSessionTime: function() {
        document.getElementById('sessionDuration').value = 60;
        this.calculateSessionTotal();
    },
    
    addCustomer: function() {
        const newCustomer = {
            id: Date.now(),
            name: document.getElementById('customerName').value,
            phone: document.getElementById('customerPhone').value,
            joinDate: new Date().toLocaleDateString('ar-SA'),
            credit: 0
        };
        
        this.customers.push(newCustomer);
        this.saveData();
        this.renderCustomers();
        this.updateStats();
        
        document.getElementById('customerForm').reset();
        
        alert(`تم إضافة العميل ${newCustomer.name} بنجاح!`);
    },
    
    renderCustomers: function(searchTerm = '') {
        const customersList = document.getElementById('customersList');
        customersList.innerHTML = '';
        
        let filteredCustomers = this.customers;
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredCustomers = this.customers.filter(customer => 
                customer.name.toLowerCase().includes(term) || 
                customer.phone.includes(term)
            );
        }
        
        if (filteredCustomers.length === 0) {
            customersList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-users fa-3x mb-3 text-muted"></i>
                    <p class="text-muted">لا يوجد عملاء لعرضهم</p>
                </div>
            `;
            return;
        }
        
        filteredCustomers.forEach(customer => {
            const customerCard = document.createElement('div');
            customerCard.className = 'customer-card';
            
            const hasActiveSession = Object.values(this.activeTimers).some(timer => timer.customerId === customer.id && !timer.paused);
            const hasPausedSession = Object.values(this.activeTimers).some(timer => timer.customerId === customer.id && timer.paused);
            
            if (hasActiveSession) {
                customerCard.classList.add('active-session');
            } else if (hasPausedSession) {
                customerCard.classList.add('paused');
            }
            
            customerCard.innerHTML = `
                <div class="row align-items-center">
                    <div class="col-md-1 text-center">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&size=64&background=6c5ce7&color=fff" 
                             class="customer-avatar" alt="${customer.name}">
                    </div>
                    <div class="col-md-7">
                        <h5 class="mb-1">${customer.name}</h5>
                        <p class="text-muted mb-0">${customer.phone}</p>
                        <small class="text-muted">انضم في: ${customer.joinDate}</small>
                        ${customer.credit > 0 ? `<div class="customer-credit">رصيد متاح: ${customer.credit} دقيقة</div>` : ''}
                        ${hasActiveSession ? '<div class="remaining-time">جلسة نشطة - وقت متبقي: <span class="timer-display"></span></div>' : ''}
                        ${hasPausedSession ? '<div class="remaining-time">جلسة موقوفة - وقت متبقي: <span class="timer-display"></span></div>' : ''}
                    </div>
                    <div class="col-md-4 text-start">
                        <button class="btn btn-primary btn-action add-session" data-id="${customer.id}">
                            <i class="fas fa-plus me-1"></i> إضافة جلسة
                        </button>
                        <button class="btn btn-warning btn-action edit-customer" data-id="${customer.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-action delete-customer" data-id="${customer.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            customersList.appendChild(customerCard);
            
            const addSessionBtn = customerCard.querySelector('.add-session');
            const deleteCustomerBtn = customerCard.querySelector('.delete-customer');
            const editCustomerBtn = customerCard.querySelector('.edit-customer');
            
            addSessionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(addSessionBtn.getAttribute('data-id'));
                this.openAddSessionModal(id);
            });
            
            deleteCustomerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(deleteCustomerBtn.getAttribute('data-id'));
                this.deleteCustomer(id);
            });
            
            editCustomerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(editCustomerBtn.getAttribute('data-id'));
                this.editCustomer(id);
            });
            
            customerCard.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-action')) {
                    const id = parseInt(addSessionBtn.getAttribute('data-id'));
                    this.viewSessions(id);
                }
            });
            
            if (hasActiveSession || hasPausedSession) {
                const timerId = Object.keys(this.activeTimers).find(key => 
                    this.activeTimers[key].customerId === customer.id
                );
                
                if (timerId) {
                    this.updateTimerDisplay(customerCard, this.activeTimers[timerId]);
                }
            }
        });
    },
    
    updateTimerDisplay: function(customerCard, timer) {
        const timerDisplay = customerCard.querySelector('.timer-display');
        if (timerDisplay) {
            const remainingTime = timer.paused ? timer.remainingTime : this.calculateRemainingTime(timer);
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    },
    
    calculateRemainingTime: function(timer) {
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - timer.startTime;
        return Math.max(0, timer.duration - elapsed);
    },
    
    openAddSessionModal: function(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;
        
        this.currentCustomerId = customerId;
        
        document.getElementById('sessionCustomerId').value = customer.id;
        document.getElementById('sessionCustomerName').textContent = customer.name;
        
        document.getElementById('sessionForm').reset();
        document.getElementById('sessionDuration').value = 60;
        document.getElementById('sessionPrice').value = 5000;
        document.getElementById('useCredit').checked = false;
        document.getElementById('availableCredit').textContent = customer.credit || 0;
        document.getElementById('usedCredit').textContent = '0';
        document.getElementById('sessionPrice').disabled = false;
        
        this.calculateSessionTotal();
        
        const modal = new bootstrap.Modal(document.getElementById('addSessionModal'));
        modal.show();
    },
    
    calculateSessionTotal: function() {
        const useCredit = document.getElementById('useCredit').checked;
        const duration = parseFloat(document.getElementById('sessionDuration').value) || 0;
        const price = useCredit ? 0 : parseFloat(document.getElementById('sessionPrice').value) || 0;
        const total = (duration / 60) * price;
        
        document.getElementById('sessionTotal').value = total.toFixed(0);
        
        document.getElementById('reportDuration').textContent = duration;
        document.getElementById('reportPrice').textContent = price;
        document.getElementById('reportTotal').textContent = total.toFixed(0);
    },
    
    addSession: function() {
        const useCredit = document.getElementById('useCredit').checked;
        const durationMinutes = parseFloat(document.getElementById('sessionDuration').value);
        const pricePerHour = useCredit ? 0 : parseFloat(document.getElementById('sessionPrice').value);
        
        const newSession = {
            id: Date.now(),
            customerId: this.currentCustomerId,
            date: new Date().toISOString(),
            duration: durationMinutes * 60,
            price: pricePerHour,
            total: (durationMinutes / 60) * pricePerHour,
            notes: document.getElementById('sessionNotes').value,
            createdAt: new Date().toLocaleString('ar-US'),
            usedCredit: useCredit ? durationMinutes : 0,
            isPaid: document.getElementById('sessionPaid').checked
        };
        
        if (useCredit) {
            const customer = this.customers.find(c => c.id === this.currentCustomerId);
            if (customer) {
                customer.credit = Math.max(0, (customer.credit || 0) - durationMinutes);
            }
        }
        
        this.sessions.push(newSession);
        this.startTimer(newSession.id, this.currentCustomerId, newSession.duration);
        this.saveData();
        
        bootstrap.Modal.getInstance(document.getElementById('addSessionModal')).hide();
        alert('تم إضافة الجلسة بنجاح!' + (useCredit ? ' (تم استخدام الرصيد)' : ''));
    },
    
    togglePaymentStatus: function(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (session) {
            session.isPaid = !session.isPaid;
            this.saveData();
            this.renderSessions(this.currentCustomerId);
            this.updateStats();
        }
    },
    
    startTimer: function(sessionId, customerId, duration) {
        this.activeTimers[sessionId] = {
            customerId: customerId,
            duration: duration,
            startTime: Math.floor(Date.now() / 1000),
            remainingTime: duration,
            paused: false
        };
        this.saveData();
        this.renderCustomers();
    },
    
    pauseTimer: function(sessionId) {
        if (this.activeTimers[sessionId]) {
            const timer = this.activeTimers[sessionId];
            if (!timer.paused) {
                timer.remainingTime = this.calculateRemainingTime(timer);
                timer.paused = true;
                this.saveData();
                this.renderCustomers();
                this.renderSessions(timer.customerId);
            }
        }
    },
    
    resumeTimer: function(sessionId) {
        if (this.activeTimers[sessionId] && this.activeTimers[sessionId].paused) {
            const timer = this.activeTimers[sessionId];
            timer.startTime = Math.floor(Date.now() / 1000) - (timer.duration - timer.remainingTime);
            timer.paused = false;
            this.saveData();
            this.renderCustomers();
            this.renderSessions(timer.customerId);
        }
    },
    
    stopTimer: function(sessionId) {
        if (this.activeTimers[sessionId]) {
            delete this.activeTimers[sessionId];
            this.saveData();
            this.renderCustomers();
        }
    },
    
    saveTimeAsCredit: function(sessionId) {
        if (this.activeTimers[sessionId]) {
            const timer = this.activeTimers[sessionId];
            const remainingTime = timer.paused ? timer.remainingTime : this.calculateRemainingTime(timer);
            const remainingMinutes = Math.floor(remainingTime / 60);
            
            if (remainingMinutes > 0) {
                const customer = this.customers.find(c => c.id === timer.customerId);
                if (customer) {
                    customer.credit = (customer.credit || 0) + remainingMinutes;
                    
                    delete this.activeTimers[sessionId];
                    
                    this.saveData();
                    this.renderCustomers();
                    this.renderSessions(timer.customerId);
                    
                    alert(`تم حفظ ${remainingMinutes} دقيقة كرصيد للعميل ${customer.name}`);
                }
            } else {
                alert('لا يوجد وقت متبقي لحفظه كرصيد');
            }
        }
    },
    
    checkActiveSessions: function() {
        const now = Math.floor(Date.now() / 1000);
        let needsSave = false;
        
        const timerIds = Object.keys(this.activeTimers);
        for (const sessionId of timerIds) {
            const timer = this.activeTimers[sessionId];
            
            if (timer.paused) {
                const customerCard = document.querySelector(`.customer-card .add-session[data-id='${timer.customerId}']`);
                if (customerCard) {
                    this.updateTimerDisplay(customerCard.closest('.customer-card'), timer);
                }
            } else {
                const remainingTime = this.calculateRemainingTime(timer);
                
                const customerCard = document.querySelector(`.customer-card .add-session[data-id='${timer.customerId}']`);
                if (customerCard) {
                    this.updateTimerDisplay(customerCard.closest('.customer-card'), timer);
                }
                
                if (remainingTime <= 0) {
                    delete this.activeTimers[sessionId];
                    needsSave = true;
                }
            }
        }
        
        if (needsSave) {
            this.saveData();
            this.renderCustomers();
        }
        
        setTimeout(() => this.checkActiveSessions(), 1000);
    },
    
    viewSessions: function(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;
        
        this.currentCustomerId = customerId;
        
        document.getElementById('sessionsCustomerName').textContent = customer.name;
        
        this.renderSessions(customerId);
        
        const modal = new bootstrap.Modal(document.getElementById('sessionsModal'));
        modal.show();
    },
    
    renderSessions: function(customerId) {
        const sessionsList = document.getElementById('sessionsList');
        const customerSessions = this.sessions.filter(session => session.customerId === customerId);

        document.getElementById('totalSessionsCount').textContent = customerSessions.length;
        this.updateCustomerStats(customerId);

        if (customerSessions.length === 0) {
            sessionsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-clock fa-2x mb-2 text-muted"></i>
                    <p class="text-muted">لا توجد جلسات لعرضها</p>
                </div>
            `;
            return;
        }

        sessionsList.innerHTML = '';
        
        customerSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        const groupedSessions = {};
        customerSessions.forEach(session => {
            const sessionDate = new Date(session.date).toLocaleDateString('ar-SA');
            if (!groupedSessions[sessionDate]) {
                groupedSessions[sessionDate] = [];
            }
            groupedSessions[sessionDate].push(session);
        });

        for (const date in groupedSessions) {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'session-day-header p-2 mt-3 mb-2 rounded';
            dayHeader.innerHTML = `<h6 class="mb-0">${date}</h6>`;
            sessionsList.appendChild(dayHeader);

            groupedSessions[date].forEach(session => {
                const durationMinutes = Math.floor(session.duration / 60);
                const isActive = this.activeTimers[session.id] !== undefined;
                const isPaused = isActive && this.activeTimers[session.id].paused;

                const isPaid = session.isPaid;
                const paymentStatus = isPaid ? 'تم الدفع' : 'غير مدفوع';
                const paymentClass = isPaid ? 'text-success' : 'text-danger';
                
                const sessionItem = document.createElement('div');
                sessionItem.className = `session-item ${isActive ? (isPaused ? 'paused' : 'active-session') : ''}`;
                
                sessionItem.innerHTML = `
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <strong>${new Date(session.date).toLocaleTimeString('ar-SA')}</strong>
                            ${session.usedCredit > 0 ? '<span class="free-session-badge">رصيد</span>' : ''}
                        </div>
                        <div class="col-md-2">
                            <span>${durationMinutes} دقيقة</span>
                        </div>
                        <div class="col-md-2">
                            <span>${session.price} ل.س/س</span>
                        </div>
                        <div class="col-md-3">
                            <span class="${paymentClass}"><strong>${paymentStatus}</strong></span>
                            <span class="text-success ms-2"><strong>${session.total.toFixed(0)} ل.س</strong></span>
                        </div>
                        <div class="col-md-2 text-start">
                            <button class="btn btn-sm btn-info toggle-payment" data-id="${session.id}">
                                <i class="fas fa-money-bill-wave"></i>
                            </button>
                            ${isActive ? `
                                ${isPaused ? 
                                    `<button class="btn btn-sm btn-success resume-session" data-id="${session.id}">
                                        <i class="fas fa-play"></i>
                                    </button>` : 
                                    `<button class="btn btn-sm btn-warning pause-session" data-id="${session.id}">
                                        <i class="fas fa-pause"></i>
                                    </button>`
                                }
                                <button class="btn btn-sm btn-info save-credit" data-id="${session.id}">
                                    <i class="fas fa-piggy-bank"></i>
                                </button>
                                <button class="btn btn-sm btn-danger stop-session" data-id="${session.id}">
                                    <i class="fas fa-stop"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-danger delete-session" data-id="${session.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    ${session.notes ? `<div class="row mt-2"><div class="col-md-12"><small class="text-muted">${session.notes}</small></div></div>` : ''}
                    ${session.usedCredit > 0 ? `<div class="row mt-2"><div class="col-md-12"><small class="text-success">تم استخدام ${session.usedCredit} دقيقة من الرصيد</small></div></div>` : ''}
                    ${isActive ? `
                        <div class="row mt-2">
                            <div class="col-md-12">
                                <div class="timer-display">
                                    الوقت المتبقي: 
                                    ${isPaused ? 
                                        `${Math.floor(this.activeTimers[session.id].remainingTime / 60)}:${(this.activeTimers[session.id].remainingTime % 60).toString().padStart(2, '0')}` : 
                                        'جاري العد...'
                                    }
                                </div>
                            </div>
                        </div>
                    ` : ''}
                `;
                
                sessionsList.appendChild(sessionItem);

                const togglePaymentBtn = sessionItem.querySelector('.toggle-payment');
                togglePaymentBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(togglePaymentBtn.getAttribute('data-id'));
                    this.togglePaymentStatus(id);
                });
                
                if (isActive) {
                    if (isPaused) {
                        const resumeSessionBtn = sessionItem.querySelector('.resume-session');
                        resumeSessionBtn.addEventListener('click', (e) => {
                            const id = parseInt(resumeSessionBtn.getAttribute('data-id'));
                            this.resumeTimer(id);
                        });
                    } else {
                        const pauseSessionBtn = sessionItem.querySelector('.pause-session');
                        pauseSessionBtn.addEventListener('click', (e) => {
                            const id = parseInt(pauseSessionBtn.getAttribute('data-id'));
                            this.pauseTimer(id);
                        });
                    }
                    
                    const saveCreditBtn = sessionItem.querySelector('.save-credit');
                    saveCreditBtn.addEventListener('click', (e) => {
                        const id = parseInt(saveCreditBtn.getAttribute('data-id'));
                        this.saveTimeAsCredit(id);
                    });
                    
                    const stopSessionBtn = sessionItem.querySelector('.stop-session');
                    stopSessionBtn.addEventListener('click', (e) => {
                            const id = parseInt(stopSessionBtn.getAttribute('data-id'));
                            this.stopTimer(id);
                    });
                }
                
                const deleteSessionBtn = sessionItem.querySelector('.delete-session');
                deleteSessionBtn.addEventListener('click', (e) => {
                    const id = parseInt(deleteSessionBtn.getAttribute('data-id'));
                    this.deleteSession(id);
                });
            });
        }
    },
    
    updateCustomerStats: function(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        const customerSessions = this.sessions.filter(session => session.customerId === customerId);
        
        const totalTime = customerSessions.reduce((sum, session) => sum + (session.duration / 60), 0);
        document.getElementById('customerTotalTime').textContent = `${totalTime.toFixed(0)} دقيقة`;
        
        const totalSpent = customerSessions.reduce((sum, session) => sum + session.total, 0);
        document.getElementById('customerTotalSpent').textContent = `${totalSpent.toFixed(0)} ل.س`;
        
        document.getElementById('customerSessionsCount').textContent = customerSessions.length;
        
        document.getElementById('customerCredit').textContent = customer.credit || 0;
    },
    
    deleteSession: function(sessionId) {
        if(confirm('هل أنت متأكد من حذف هذه الجلسة؟')) {
            const session = this.sessions.find(s => s.id === sessionId);
            
            if (session && session.usedCredit > 0) {
                const customer = this.customers.find(c => c.id === session.customerId);
                if (customer) {
                    customer.credit = (customer.credit || 0) + session.usedCredit;
                }
            }
            
            this.sessions = this.sessions.filter(session => session.id !== sessionId);
            
            if (this.activeTimers[sessionId]) {
                delete this.activeTimers[sessionId];
            }
            
            this.saveData();
            this.renderSessions(this.currentCustomerId);
            this.updateStats();
            alert('تم حذف الجلسة بنجاح!');
        }
    },
    
    deleteCustomer: function(customerId) {
        if(confirm('هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع جلساته أيضًا.')) {
            this.customers = this.customers.filter(customer => customer.id !== customerId);
            this.sessions = this.sessions.filter(session => session.customerId !== customerId);
            
            for (const sessionId in this.activeTimers) {
                if (this.activeTimers[sessionId].customerId === customerId) {
                    delete this.activeTimers[sessionId];
                }
            }
            
            this.saveData();
            this.renderCustomers();
            this.updateStats();
            alert('تم حذف العميل بنجاح!');
        }
    },
    
    editCustomer: function(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;
        
        const newName = prompt('أدخل الاسم الجديد:', customer.name);
        if (newName === null) return;
        
        const newPhone = prompt('أدخل رقم الهاتف الجديد:', customer.phone);
        if (newPhone === null) return;
        
        customer.name = newName;
        customer.phone = newPhone;
        
        this.saveData();
        this.renderCustomers();
        this.updateStats();
        
        alert('تم تحديث بيانات العميل بنجاح!');
    },

    updateStats: function() {
        document.getElementById('totalCustomers').textContent = this.customers.length;
        document.getElementById('totalSessions').textContent = this.sessions.length;
        
        const totalRevenue = this.sessions
            .filter(session => session.isPaid)
            .reduce((sum, session) => sum + (session.total || 0), 0);
        
        document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString();
        
        const activeSessionsCount = Object.values(this.activeTimers).filter(timer => !timer.paused).length;
        document.getElementById('activeSessions').textContent = activeSessionsCount;
    },

    exportData: function() {
        const dataToExport = {
            customers: this.customers,
            sessions: this.sessions,
            activeTimers: this.activeTimers
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gaming_data_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importData: function(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.customers && importedData.sessions && importedData.activeTimers) {
                    this.customers = importedData.customers;
                    this.sessions = importedData.sessions;
                    this.activeTimers = importedData.activeTimers;
                    this.saveData();
                    this.renderCustomers();
                    this.updateStats();
                    alert('تم استيراد البيانات بنجاح!');
                } else {
                    alert('صيغة الملف غير صحيحة.');
                }
            } catch (e) {
                alert('حدث خطأ أثناء قراءة الملف. تأكد من أنه ملف JSON صحيح.');
            }
        };
        reader.readAsText(file);
    },

    clearAllData: function() {
        if (confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء!')) {
            localStorage.removeItem('gamingCustomers');
            localStorage.removeItem('gamingSessions');
            localStorage.removeItem('gamingTimers');
            this.customers = [];
            this.sessions = [];
            this.activeTimers = {};
            this.renderCustomers();
            this.updateStats();
            alert('تم مسح جميع البيانات بنجاح!');
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    app.init();
});
