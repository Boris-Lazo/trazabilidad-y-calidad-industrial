# Arquitectura del Proyecto

Este proyecto sigue una arquitectura en capas y principios SOLID para asegurar la mantenibilidad y escalabilidad.

## Estructura de Carpetas

- `backend/`: Contiene toda la lógica del servidor, API y acceso a datos.
- `frontend/`: Contiene los archivos estáticos (HTML, CSS, JS) de la interfaz de usuario.
- `mfcalidad.sqlite`: Base de datos SQLite del proyecto.

## Capas del Backend (MVC adaptado)

1.  **Capa de Rutas (`*.routes.js`)**: Define los endpoints de la API y mapea las peticiones HTTP a los controladores correspondientes.
2.  **Capa de Controladores (`*.controller.js`)**: Gestiona la lógica de las peticiones, valida la entrada y coordina la respuesta. Se comunica con los modelos.
3.  **Capa de Modelos (`*.model.js`)**: Encapsula el acceso a la base de datos (SQLite). Cada modelo es responsable de las operaciones CRUD y consultas específicas de su dominio.
4.  **Capa de Configuración (`config/`)**: Centraliza la conexión a la base de datos y otras configuraciones globales.

## Cumplimiento de Principios SOLID

- **Single Responsibility Principle (SRP)**: Cada módulo tiene una responsabilidad única. Los controladores solo manejan el flujo de la petición, mientras que los modelos solo manejan la persistencia de datos.
- **Open/Closed Principle (OCP)**: La estructura basada en dominios permite agregar nuevas funcionalidades (nuevos dominios) sin necesidad de modificar el código existente en otros dominios.
- **Interface Segregation Principle (ISP)**: Aunque JavaScript no tiene interfaces formales, el diseño de los módulos exporta solo las funciones necesarias, evitando dependencias innecesarias.
- **Dependency Inversion Principle (DIP)**: Se fomenta la separación de la lógica de negocio de los detalles de implementación de la base de datos mediante el uso de modelos.
