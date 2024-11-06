import React, { useState, useEffect } from 'react';
import './BookingForm.css';

const prices = {
    office: 100,
    private: 200,
    conference: 150,
    virtualOffice: 50,
    dedicatedDesk: 75,
    trainingHall: 120,
    coworkingSpace: 90
};

const BookingForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        service: '',
        startDate: '',
        endDate: '',
        price: 0,
    });

    // Calculate price based on service and dates
    const calculatePrice = () => {
        const { service, startDate, endDate } = formData;
        if (service && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (end >= start) {
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                const dailyRate = prices[service];
                const totalCost = days * dailyRate;
                setFormData(prevData => ({ ...prevData, price: totalCost }));
                return totalCost;
            }
        }
        setFormData(prevData => ({ ...prevData, price: 0 }));
        return 0;
    };

    // Update price when form fields change
    useEffect(() => {
        calculatePrice();
    }, [formData.service, formData.startDate, formData.endDate]);

    // Update form data on input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    // Handle form submission and payment
    const handleSubmit = async (e) => {
        e.preventDefault();
        const amount = calculatePrice();

        if (amount === 0) {
            alert("Please select a valid service and dates.");
            return;
        }

        // Initiate Flutterwave payment
        FlutterwaveCheckout({
            public_key: "FLWPUBK_TEST-0c737b1f0ae62eaa808e98127caa3222-X",
            tx_ref: "bookspace_" + Date.now(),
            amount: amount,
            currency: "USD",
            payment_options: "card, mobilemoney",
            customer: {
                email: formData.email,
                phone_number: formData.phone,
                name: formData.name,
            },
            callback: (response) => {
                if (response.status === "successful") {
                    const transactionId = response.transaction_id;

                    // After successful payment, send data to backend
                    fetch('/api/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ...formData, transactionId, price: `$${amount}` })
                    })
                    .then(response => response.text())
                    .then(message => alert(message))
                    .catch(error => console.error("Error:", error));
                } else {
                    alert("Payment failed. Please try again.");
                }
            },
            onclose: () => {
                alert("Payment process interrupted. Please complete the payment.");
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} id="booking-form">
            <input
                type="text"
                name="name"
                placeholder="Your Name *"
                required
                value={formData.name}
                onChange={handleInputChange}
            />
            <input
                type="text"
                name="email"
                placeholder="Your Email *"
                required
                value={formData.email}
                onChange={handleInputChange}
            />
            <input
                type="text"
                name="phone"
                placeholder="Your Phone Number"
                value={formData.phone}
                onChange={handleInputChange}
            />

            <select
                name="service"
                required
                value={formData.service}
                onChange={handleInputChange}
            >
                <option value="">Select Service *</option>
                <option value="office">Office space</option>
                <option value="private">Private space</option>
                <option value="conference">Conference room</option>
                <option value="virtualOffice">Virtual Office</option>
                <option value="dedicatedDesk">Dedicated Desk</option>
                <option value="trainingHall">Training Hall</option>
                <option value="coworkingSpace">Coworking Space</option>
            </select>

            <input
                type="date"
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleInputChange}
            />
            <input
                type="date"
                name="endDate"
                required
                value={formData.endDate}
                onChange={handleInputChange}
            />

            <div className="price-display">
                Total Amount: <span>${formData.price}</span>
            </div>

            <button type="submit">
                Book Space
            </button>
        </form>
    );
};

export default BookingForm;
