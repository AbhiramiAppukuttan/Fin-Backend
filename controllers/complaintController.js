const asyncHandler = require("express-async-handler");
const Complaint = require("../models/complaintModel");
const Notification = require("../models/notificationModel");

const complaintController={
    fileComplaint  : asyncHandler(async (req, res) => {
    const { type, description } = req.body;
    const complaint = new Complaint({
      user: req.user.id, 
      type,
      description,
      date:new Date()
    });
    await complaint.save();
    if(!complaint){
        res.send("Error in filing complaint")
      }
    res.send('Complaint filed successfully');
}),

getAllComplaints :asyncHandler(async (req, res) => {
      const complaints = await Complaint.find().populate('user')
           
      if(!complaints){
        res.send("No complaints found")
      }
      res.send(complaints);
  }),

  getUserComplaints :asyncHandler(async (req, res) => {
      const complaints = await Complaint.find({ user: req.user.id })
      if(!complaints){
        res.send("No complaints found")
      }
      res.send(complaints);
  }),

updateComplaintStatus: asyncHandler(async (req, res) => {
    const { id } = req.body; // ID of the complaint to resolve

    const complaint = await Complaint.findById(id);
    if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
    }

    // Update status to "Resolved"
    complaint.status = "Resolved";
    await complaint.save();

    // Send a notification to the user
    await Notification.create({
        user: complaint.user, // The user who filed the complaint
        message: `Your feedback regarding "${complaint.type}" has been resolved by the Admin.`,
    });

    res.json({ message: "Complaint resolved successfully", complaint });
}),


}
module.exports=complaintController