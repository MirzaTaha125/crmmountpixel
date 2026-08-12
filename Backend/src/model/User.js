import mongoose from "mongoose";



const userSchema = new mongoose.Schema({
    First_Name:{
        type:String,
        required:true,
    },
    Last_Name:{
        type:String,
        required:true,
    },
    Email:{
        type:String,
        required:true,
    },
    Password:{
        type:String,
        required:true,
    },
    Confirm_Password:{
        type:String,
        required:true,
    },
    Role:{
        type:String,
    },
    roleId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    },
    workEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
        validate: {
            validator: function(v) {
                return !v || /^\S+@\S+\.\S+$/.test(v);
            },
            message: 'Please enter a valid email address'
        }
    },
    workEmailName: {
        type: String,
        trim: true,
        default: '',
        maxlength: 100
    },
    workPassword: {
        type: String,
        default: '',
        select: false // Don't return in queries by default
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        select: false, // Don't return in queries by default
        default: null
    },
    twoFactorBackupCodes: [{
        code: {
            type: String,
            required: true
        },
        used: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    twoFactorVerified: {
        type: Boolean,
        default: false // True after user successfully verifies during setup
    },
    twoFactorPermanentBackupCode: {
        type: String,
        select: false, // Don't return in queries by default
        default: null // Hashed permanent backup code (can be used multiple times)
    }
},{ timestamps: true })

const User = mongoose.model("User",userSchema);
export default User;
