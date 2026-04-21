interface FooterProps {
  isExpanded: boolean;
}

export default function Footer({ isExpanded }: FooterProps) {
  return (
    <footer className={`fixed bottom-0 left-0 ${isExpanded ? 'lg:left-64' : 'lg:left-20'} right-0 bg-white border-t border-gray-200 py-3 px-4 md:px-6 text-center text-sm text-gray-500 z-60 transition-all duration-300 ease-in-out`}>
      Powered by Botivate
    </footer>
  );
}
