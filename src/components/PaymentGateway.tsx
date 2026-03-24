import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CreditCard, Smartphone, Building2, ShieldCheck, CheckCircle2, IndianRupee, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentGatewayProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  locationName: string;
  slotNumber: string;
}

type PaymentStep = "details" | "processing" | "success";

export default function PaymentGateway({ open, onClose, onSuccess, amount, locationName, slotNumber }: PaymentGatewayProps) {
  const [step, setStep] = useState<PaymentStep>("details");
  const [method, setMethod] = useState("card");

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("");

  const banks = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank", "Bank of Baroda"];

  const resetForm = () => {
    setStep("details");
    setCardNumber("");
    setCardName("");
    setExpiry("");
    setCvv("");
    setUpiId("");
    setSelectedBank("");
    setMethod("card");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatCardNumber = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 16);
    return nums.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 4);
    if (nums.length > 2) return nums.slice(0, 2) + "/" + nums.slice(2);
    return nums;
  };

  const isValid = () => {
    if (method === "card") return cardNumber.replace(/\s/g, "").length === 16 && cardName.length > 2 && expiry.length === 5 && cvv.length >= 3;
    if (method === "upi") return upiId.includes("@") && upiId.length > 4;
    if (method === "netbanking") return selectedBank.length > 0;
    return false;
  };

  const handlePay = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("success");
      setTimeout(() => {
        resetForm();
        onSuccess();
      }, 1800);
    }, 2500);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && step === "details") handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button]:hidden">
        <AnimatePresence mode="wait">
          {step === "details" && (
            <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -40 }}>
              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground">
                {/* Custom close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 h-7 w-7 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-primary-foreground" />
                </button>

                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-bold text-lg">ParkEase Pay</h2>
                  <span className="inline-flex items-center gap-1 bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                    <ShieldCheck className="h-3 w-3" /> Secure
                  </span>
                </div>
                <p className="text-primary-foreground/60 text-xs mb-4">Simulated Payment Gateway</p>

                <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
                  <span className="text-xs text-primary-foreground/60 block mb-1">Total Amount</span>
                  <span className="text-3xl font-bold flex items-center gap-0.5">
                    <IndianRupee className="h-6 w-6" />{amount}
                  </span>
                  <p className="text-xs text-primary-foreground/50 mt-2">{locationName} • Slot {slotNumber}</p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="p-5 pt-4">
                <Tabs value={method} onValueChange={setMethod}>
                  <TabsList className="w-full grid grid-cols-3 mb-5 h-11">
                    <TabsTrigger value="card" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
                      <CreditCard className="h-3.5 w-3.5" /> Card
                    </TabsTrigger>
                    <TabsTrigger value="upi" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
                      <Smartphone className="h-3.5 w-3.5" /> UPI
                    </TabsTrigger>
                    <TabsTrigger value="netbanking" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
                      <Building2 className="h-3.5 w-3.5" /> Net Banking
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="card" className="space-y-3.5 mt-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Card Number</Label>
                      <Input
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        maxLength={19}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Cardholder Name</Label>
                      <Input placeholder="Bhagya Patel" value={cardName} onChange={(e) => setCardName(e.target.value)} className="h-11" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Expiry</Label>
                        <Input
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                          maxLength={5}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">CVV</Label>
                        <Input
                          type="password"
                          placeholder="•••"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          maxLength={4}
                          className="h-11"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="upi" className="space-y-3 mt-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">UPI ID</Label>
                      <Input placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="h-11" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Enter your UPI ID linked to any bank account</p>
                  </TabsContent>

                  <TabsContent value="netbanking" className="space-y-2.5 mt-0">
                    <Label className="text-xs font-medium">Select Your Bank</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {banks.map((bank) => (
                        <button
                          key={bank}
                          onClick={() => setSelectedBank(bank)}
                          className={`p-3 rounded-lg border text-xs text-left transition-all ${
                            selectedBank === bank
                              ? "border-primary bg-primary/10 font-semibold text-primary"
                              : "border-border hover:border-primary/40 hover:bg-accent/50"
                          }`}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <Button className="w-full mt-6 h-12 text-base font-semibold" onClick={handlePay} disabled={!isValid()}>
                  Pay ₹{amount}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center mt-3">
                  🔒 This is a demo payment. No real money is charged.
                </p>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 px-12 flex flex-col items-center justify-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <Loader2 className="h-14 w-14 animate-spin text-primary relative" />
              </div>
              <p className="font-display font-semibold text-lg">Processing Payment...</p>
              <p className="text-sm text-muted-foreground">Please do not close this window</p>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-16 px-12 flex flex-col items-center justify-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </motion.div>
              <p className="font-display font-bold text-xl">Payment Successful!</p>
              <p className="text-sm text-muted-foreground">₹{amount} paid via {method === "card" ? "Card" : method === "upi" ? "UPI" : "Net Banking"}</p>
              <p className="text-xs text-muted-foreground animate-pulse">Redirecting to your bookings...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}