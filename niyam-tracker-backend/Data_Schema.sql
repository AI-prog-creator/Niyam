CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mobile` varchar(20) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `pin` varchar(4) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `full_name` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `village` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `city` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `state` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `country` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `created_at` varchar(45) DEFAULT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  PRIMARY KEY (`id`)
);
CREATE TABLE `submissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `form_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `name` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `mobile` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `village` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `city` varchar(45) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `niyams` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`niyams`)),
  `description` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `niyam_give_by_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `niyam_give_by_number` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `submission_date` datetime DEFAULT current_timestamp(),
  `user_type` varchar(45) DEFAULT NULL,
  `status` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
CREATE TABLE `niyam_forms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `niyam_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `description` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,
  `status` varchar(45) DEFAULT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `public_id` varchar(45) DEFAULT NULL,
  `created_date` timestamp NULL DEFAULT current_timestamp(),
  `taker_details_required` longtext DEFAULT NULL,
  `image` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_id` (`public_id`),
  UNIQUE KEY `public_id_2` (`public_id`)
);