import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, Check } from "lucide-react";
import { useState } from "react";

interface LocationQRCodeProps {
  locationId: string;
  locationName: string;
  baseUrl: string;
}

export default function LocationQRCode({ locationId, locationName, baseUrl }: LocationQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const checkInUrl = `${baseUrl}/check-in?parking_id=${locationId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(checkInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-3.5 w-3.5 mr-1.5" /> QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs text-center">
        <DialogHeader>
          <DialogTitle className="font-display">{locationName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-white rounded-xl shadow-sm">
            <QRCodeSVG value={checkInUrl} size={200} level="H" />
          </div>
          <p className="text-xs text-muted-foreground max-w-full">
            Print this QR code and display it at the entrance. Users scan it to self check-in/out.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <p className="text-[10px] text-muted-foreground break-all">{checkInUrl}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
