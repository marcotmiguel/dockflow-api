-- DockFlow Database Schema
-- Gerado para Railway deployment

CREATE DATABASE IF NOT EXISTS dockflow_db;
USE dockflow_db;

-- Tabela: users
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('operator','analyst','admin') NOT NULL DEFAULT 'operator',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cpf` varchar(14) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `notes` text,
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `cpf` (`cpf`)
);

-- Tabela: routes
CREATE TABLE `routes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `active` tinyint(1) DEFAULT '1',
  `region` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(2) DEFAULT NULL,
  `loadings_count` int DEFAULT '0',
  `analyst_id` int DEFAULT NULL,
  `status` enum('draft','active','inactive','archived') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `analyst_id` (`analyst_id`),
  KEY `status` (`status`),
  FOREIGN KEY (`analyst_id`) REFERENCES `users` (`id`)
);

-- Tabela: docks
CREATE TABLE `docks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `status` enum('available','occupied','maintenance','inactive') DEFAULT 'available',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- Tabela: drivers
CREATE TABLE `drivers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `cpf` varchar(14) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf` (`cpf`)
);

-- Tabela: vehicles
CREATE TABLE `vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `license_plate` varchar(10) NOT NULL,
  `vehicle_type` enum('truck','van','car','motorcycle','other') NOT NULL,
  `brand` varchar(50) DEFAULT NULL,
  `model` varchar(50) DEFAULT NULL,
  `year` int DEFAULT NULL,
  `status` enum('available','in_use','maintenance','inactive') DEFAULT 'available',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `license_plate` (`license_plate`)
);

-- Tabela: products
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- Tabela: carregamentos
CREATE TABLE `carregamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero_nf` varchar(50) NOT NULL,
  `chave_acesso` varchar(44) DEFAULT NULL,
  `destinatario` varchar(255) NOT NULL,
  `local_entrega` text,
  `data_entrega` date DEFAULT NULL,
  `quantidade_volumes` int NOT NULL,
  `peso_carga` decimal(10,3) DEFAULT NULL,
  `codigo_barras` varchar(100) DEFAULT NULL,
  `nome_produto` varchar(255) DEFAULT NULL,
  `status` enum('aguardando carregamento','em carregamento','carregado','enviado','entregue','cancelado') DEFAULT 'aguardando carregamento',
  `restricoes_analisadas` text,
  `route_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `numero_nf` (`numero_nf`),
  KEY `chave_acesso` (`chave_acesso`),
  KEY `data_entrega` (`data_entrega`),
  KEY `status` (`status`),
  KEY `route_id` (`route_id`),
  FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`)
);

-- Tabela: invoices
CREATE TABLE `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_id` int DEFAULT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `serie` varchar(10) DEFAULT NULL,
  `xml_content` text,
  `recipient_name` varchar(255) DEFAULT NULL,
  `recipient_cnpj` varchar(18) DEFAULT NULL,
  `recipient_address` text,
  `total_value` decimal(12,2) DEFAULT NULL,
  `total_weight` decimal(10,3) DEFAULT NULL,
  `status` enum('pending','processing','loaded','shipped','delivered','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `route_id` (`route_id`),
  FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`)
);

-- Tabela: invoice_items
CREATE TABLE `invoice_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int DEFAULT NULL,
  `product_code` varchar(100) DEFAULT NULL,
  `product_name` varchar(255) DEFAULT NULL,
  `quantity` decimal(10,3) DEFAULT NULL,
  `unit` varchar(10) DEFAULT NULL,
  `unit_value` decimal(12,2) DEFAULT NULL,
  `total_value` decimal(12,2) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `loaded_quantity` decimal(10,3) DEFAULT '0.000',
  `status` enum('pending','partial','completed','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`)
);

-- Tabela: loadings
CREATE TABLE `loadings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dock_id` int DEFAULT NULL,
  `driver_id` int DEFAULT NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') DEFAULT 'scheduled',
  `scheduled_time` datetime DEFAULT NULL,
  `checkin_time` datetime DEFAULT NULL,
  `checkout_time` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `vehicle_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dock_id` (`dock_id`),
  KEY `driver_id` (`driver_id`),
  KEY `vehicle_id` (`vehicle_id`),
  FOREIGN KEY (`dock_id`) REFERENCES `docks` (`id`),
  FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`),
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`)
);

-- Tabela: loading_items
CREATE TABLE `loading_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loading_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `scanned` tinyint(1) DEFAULT '0',
  `scanned_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `loading_id` (`loading_id`),
  KEY `product_id` (`product_id`),
  FOREIGN KEY (`loading_id`) REFERENCES `loadings` (`id`),
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
);

-- Tabela: loading_queue
CREATE TABLE `loading_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_cpf` varchar(14) NOT NULL,
  `driver_name` varchar(255) DEFAULT NULL,
  `vehicle_plate` varchar(10) DEFAULT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `route_code` varchar(50) NOT NULL,
  `route_id` int DEFAULT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('waiting','authorized','loading','completed','cancelled') DEFAULT 'waiting',
  `dock_id` int DEFAULT NULL,
  `authorized_by` int DEFAULT NULL,
  `authorized_at` timestamp NULL DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `estimated_duration` int DEFAULT '120',
  `priority` int DEFAULT '1',
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `driver_cpf` (`driver_cpf`),
  KEY `route_id` (`route_id`),
  KEY `status` (`status`),
  KEY `dock_id` (`dock_id`),
  KEY `authorized_by` (`authorized_by`),
  FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`),
  FOREIGN KEY (`dock_id`) REFERENCES `docks` (`id`),
  FOREIGN KEY (`authorized_by`) REFERENCES `users` (`id`)
);

-- Tabela: loading_scans
CREATE TABLE `loading_scans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `queue_id` int DEFAULT NULL,
  `invoice_item_id` int DEFAULT NULL,
  `scanned_quantity` decimal(10,3) DEFAULT NULL,
  `scanned_by` int DEFAULT NULL,
  `scanned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `barcode_scanned` varchar(100) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `queue_id` (`queue_id`),
  KEY `invoice_item_id` (`invoice_item_id`),
  KEY `scanned_by` (`scanned_by`),
  FOREIGN KEY (`queue_id`) REFERENCES `loading_queue` (`id`),
  FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items` (`id`),
  FOREIGN KEY (`scanned_by`) REFERENCES `users` (`id`)
);

-- Tabela: whatsapp_log
CREATE TABLE `whatsapp_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(20) DEFAULT NULL,
  `driver_cpf` varchar(14) DEFAULT NULL,
  `message_type` enum('welcome','queue_position','authorized','loading_ready','completed','cancelled') DEFAULT NULL,
  `message_content` text,
  `queue_id` int DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('sent','delivered','failed','pending') DEFAULT 'sent',
  PRIMARY KEY (`id`),
  KEY `phone_number` (`phone_number`),
  KEY `queue_id` (`queue_id`),
  FOREIGN KEY (`queue_id`) REFERENCES `loading_queue` (`id`)
);