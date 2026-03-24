import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode } from "lucide-react";

interface BookingQRCodeProps {
  qrCode: string;
  bookingStatus: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
}

export default function BookingQRCode({ qrCode, bookingStatus, checkedInAt, checkedOutAt }: BookingQRCodeProps) {
  const getStatusLabel = () => {
    if (checkedOutAt) return "Checked Out";
    if (checkedInAt) return "Checked In";
    if (bookingStatus === "confirmed") return "Ready to Check In";
    return bookingStatus;
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (checkedOutAt) return "secondary";
    if (checkedInAt) return "default";
    if (bookingStatus === "confirmed") return "outline";
    return "destructive";
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <QrCode className="h-4 w-4" />
          Show QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs text-center">
        <DialogHeader>
          <DialogTitle className="font-display">Booking QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-white rounded-xl">
            <QRCodeSVG value={qrCode} size={200} level="H" />
          </div>
          <p className="text-sm font-mono text-muted-foreground">{qrCode}</p>
          <Badge variant={getStatusVariant()}>{getStatusLabel()}</Badge>
          <p className="text-xs text-muted-foreground">
            Show this QR code at the parking entrance, or scan the location's QR to self-check-in.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
