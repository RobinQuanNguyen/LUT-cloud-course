import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../lib/utils.js';
import { sendWelcomeEmail } from '../emails/emailHandlers.js';
import { ENV } from '../lib/env.js';
import cloudinary from '../lib/cloudinary.js';

export const signup = async (req, res) => {
    const {fullName, email, password} = req.body;

    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({message: "Please provide all required fields"});
        }

        if (password.length < 6) {
            return res.status(400).json({message: "Password must be at least 6 characters long"});
        }

        // check if emails valid:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({message: "Please provide a valid email address"});
        }

        const user = await User.findOne({email: email});
        if (user) {
            return res.status(400).json({message: "Email already exists"});
        }

        // 123456 => $SJGkdsf_sewjd!@nf1
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword
        })

        if (newUser) {
            // generateToken(newUser._id, res);
            // await newUser.save();

            // we need to save the user first to get the _id for generating token
            const savedUser = await newUser.save();
            generateToken(savedUser._id, res);

            res.status(201).json({
                _id: savedUser._id,
                fullName: savedUser.fullName,
                email: savedUser.email,
                profilePic: savedUser.profilePic,
            });

            // try {
            //     await sendWelcomeEmail(savedUser.email, savedUser.fullName, ENV.CLIENT_URL);
            // } catch (error) {
            //     console.log("Error sending welcome email", error.message);
            // }

        } else {
            res.status(400).json({message: "Invalid user data"});
        }

    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({message: "Internal server error"});
    }
}

export const login = async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({message: "Email and password are required"});
    }

    try {
        const user = await User.findOne({email: email});
        if (!user) {
            return res.status(400).json({message: "Invalid credentials"});
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({message: "Invalid credentials"});
        }

        generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic,
        })

    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({message: "Internal server error"});
    }
}

export const logout = async (_, res) => {
    res.cookie("jwt", "", {maxAge: 0})
    res.status(200).json({message: "Logged out successfully"});
}

export const updateProfile = async (req, res) => {
    try {
        const { profilePic} = req.body;
        if (!profilePic) {
            return res.status(400).json({message: "Profile picture is required"});
        }

        const userId = req.user._id;

        const uploadResponse = await cloudinary.uploader.upload(profilePic)

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            {profilePic: uploadResponse.secure_url}, 
            {new: true} // we need to return the updated user data, so we set new: true
        ); 

        res.status(200).json(updatedUser);

    } catch (error) {
        console.log("Error in updateProfile controller", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};