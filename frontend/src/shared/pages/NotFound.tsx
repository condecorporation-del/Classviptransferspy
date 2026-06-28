import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center px-4">
      <h1 className="text-8xl font-display text-gold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Página no encontrada
      </p>
      <Link
        to="/"
        className="gold-gradient text-secondary-foreground px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:brightness-105 transition-all"
      >
        Volver al Inicio
      </Link>
    </div>
  </div>
);

export default NotFound;
