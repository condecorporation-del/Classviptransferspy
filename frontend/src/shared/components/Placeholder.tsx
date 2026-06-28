const Placeholder = ({ title }: { title: string }) => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-display text-navy mb-4">{title}</h1>
      <p className="text-muted-foreground">Página en construcción</p>
    </div>
  </div>
);

export default Placeholder;
