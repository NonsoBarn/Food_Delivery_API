"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const user_entity_1 = require("./entities/user.entity");
const user_response_dto_1 = require("./dto/user-response.dto");
const class_transformer_1 = require("class-transformer");
const notification_events_1 = require("../notifications/events/notification-events");
let UsersService = UsersService_1 = class UsersService {
    userRepository;
    eventEmitter;
    logger = new common_1.Logger(UsersService_1.name);
    constructor(userRepository, eventEmitter) {
        this.userRepository = userRepository;
        this.eventEmitter = eventEmitter;
    }
    async create(createUserDto) {
        this.logger.log(`Attempting to create user: ${createUserDto.email}`);
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email },
        });
        if (existingUser) {
            this.logger.warn(`User already exists: ${createUserDto.email}`);
            throw new common_1.ConflictException('Email already registered');
        }
        const user = this.userRepository.create(createUserDto);
        const savedUser = await this.userRepository.save(user);
        this.logger.log(`User created successfully: ${savedUser.id}`);
        const event = {
            userId: savedUser.id,
            email: savedUser.email,
            role: savedUser.role,
        };
        this.eventEmitter.emit(notification_events_1.NOTIFICATION_EVENTS.USER_REGISTERED, event);
        return (0, class_transformer_1.plainToClass)(user_response_dto_1.UserResponseDto, savedUser, {
            excludeExtraneousValues: false,
        });
    }
    async findByEmail(email) {
        const user = await this.userRepository.findOne({
            where: { email },
            relations: ['vendorProfile', 'customerProfile', 'riderProfile'],
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with email ${email} not found`);
        }
        return user;
    }
    async findById(id) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return (0, class_transformer_1.plainToClass)(user_response_dto_1.UserResponseDto, user, {
            excludeExtraneousValues: false,
        });
    }
    async validateUser(email, password) {
        const user = await this.findByEmail(email);
        if (!user) {
            return null;
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return null;
        }
        return user;
    }
    async findAll() {
        const users = await this.userRepository.find();
        return users.map((user) => (0, class_transformer_1.plainToClass)(user_response_dto_1.UserResponseDto, user, {
            excludeExtraneousValues: false,
        }));
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        event_emitter_1.EventEmitter2])
], UsersService);
//# sourceMappingURL=users.service.js.map