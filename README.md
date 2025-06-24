# Sistema de Control de Acceso Universitario mediante Lectura de Código de Barras

## Descripción del Proyecto

Este proyecto presenta el desarrollo e implementación de un sistema de control de acceso para personal universitario, utilizando la lectura de códigos de barras impresos en los carnets institucionales. La solución emplea el microcontrolador ESP32, un servomotor, LEDs indicadores y una interfaz gráfica desarrollada en Python.

## Características Principales

- **ESP32** como unidad de control principal
- **Lector de código de barras** para la autenticación de usuarios
- **Servomotor y LEDs** (verde y rojo) para señalización de acceso
- **Interfaz gráfica** desarrollada en Python (Tkinter)
- **Base de datos MongoDB** para gestión de accesos y usuarios
- **Nivel de madurez tecnológica TRL4**

## Objetivos

### General
Desarrollar e implementar un prototipo de sistema de control de acceso para personal universitario.

### Específicos
- Diseñar el lector de códigos de barras.
- Crear una interfaz gráfica de gestión.
- Implementar el sistema completo con control de áreas y recursos.

## Arquitectura del Sistema

- Entrada: lector de código de barras.
- Procesamiento: microcontrolador ESP32.
- Salidas: servomotor, LEDs, interfaz gráfica.
- Almacenamiento: base de datos MongoDB.

## Componentes Utilizados

- ESP32
- Servomotor
- LEDs (rojo y verde)
- Lector de código de barras
- Fuente 5V
- Interfaz gráfica en Python (Tkinter)
- MongoDB

## Metodología

Aplicación de la metodología **Scrum**:
- Análisis y diseño
- Desarrollo del hardware y software
- Pruebas unitarias, de integración y usuario
- Implementación y mantenimiento

## Resultados

- Verificación exitosa de códigos (98% en entorno controlado)
- Gestión simultánea de hasta 200 usuarios sin retraso
- Visualización de accesos en tiempo real (diarios, semanales, mensuales)

## Futuras Mejoras

- Incorporación de lectura QR y biometría
- Integración con sistemas administrativos
- Escalabilidad para entornos empresariales o gubernamentales

## Requisitos de Hardware

- Microcontrolador ESP32
- Fuente 5V
- Lector de código de barras
- Servomotor y LEDs
- Conexiones eléctricas básicas (jumpers, resistencias)

## Requisitos de Software

- Python 3.x
- Tkinter
- MongoDB
- IDE Arduino para programación del ESP32

## Créditos

- **Andrés Mateo Reyes Londoño** - Estudiante de Ingeniería, Universidad de Caldas


## Imagenes y documentacion 
![Image](https://github.com/user-attachments/assets/3b47062b-e928-449c-84a9-9e0b61104b34)
