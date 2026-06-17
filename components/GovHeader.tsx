import Link from "next/link";

interface GovHeaderProps {
  className?: string;
}

export default function GovHeader({ className = "" }: GovHeaderProps) {
  return (
    <header className={`w-full border-b border-gray-300 bg-white py-3 ${className}`}>
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-4 px-4 text-center">
        <Link href="/" aria-label="Government of Nepal" className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://giwmscdnone.gov.np/static/assets/image/Emblem_of_Nepal.png"
            alt="Government of Nepal"
            className="h-14 w-14 object-contain"
          />
        </Link>
        <div className="leading-snug">
          <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
            नेपाल सरकार
          </h3>
          <h3 className="text-sm font-medium text-gray-800 sm:text-base">
            शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय
          </h3>
          <h2 className="text-base font-bold text-gray-900 sm:text-lg">
            शिक्षा विकास तथा समन्वय इकाइ
          </h2>
          <h3 className="text-xs font-normal text-gray-600 sm:text-sm">
            पोखरा-०१, भिमकाली पाटन, कास्की, नेपाल
          </h3>
        </div>
      </div>
    </header>
  );
}